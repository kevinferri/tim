import crypto from "crypto";
import { beforeEach, describe, it, expect } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import { encrypt } from "@tim/crypto";

beforeEach(resetDb);

async function createUser() {
  return prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name: "Test User",
      email: `${crypto.randomUUID()}@example.com`,
    },
  });
}

async function createTopic(ownerId: string) {
  const circle = await prismaClient.circle.create({
    data: {
      name: "Test Circle",
      userId: ownerId,
      members: { connect: [{ id: ownerId }] },
    },
  });
  return prismaClient.topic.create({
    data: { name: "Test Topic", userId: ownerId, circleId: circle.id },
  });
}

async function createMessage(
  userId: string,
  topicId: string,
  overrides: Partial<{
    text: string;
    mediaUrl: string | null;
    replyToId: string;
    threadRootId: string;
  }> = {},
) {
  // The AAD binds ciphertext to its row id, so it must be known before encrypting -- generate it up front instead of relying on Prisma's DB-side @default(uuid()).
  const id = crypto.randomUUID();

  return prismaClient.message.create({
    data: {
      id,
      userId,
      topicId,
      text: encrypt(overrides.text ?? "hello", id),
      mediaUrl: overrides.mediaUrl,
      replyToId: overrides.replyToId,
      threadRootId: overrides.threadRootId,
    },
  });
}

describe("messageModel.getById", () => {
  it("returns the message for a valid id", async () => {
    const user = await createUser();
    const topic = await createTopic(user.id);
    const message = await createMessage(user.id, topic.id);

    await expect(
      prismaClient.message.getById({
        messageId: message.id,
        select: { id: true },
      }),
    ).resolves.toEqual({ id: message.id });
  });

  it("returns undefined when messageId is missing", async () => {
    await expect(
      prismaClient.message.getById({
        messageId: undefined,
        select: { id: true },
      }),
    ).resolves.toBeUndefined();
  });
});

describe("messageModel.getMessagesForTopic", () => {
  it("returns messages oldest-first with decrypted text", async () => {
    const user = await createUser();
    const topic = await createTopic(user.id);
    await createMessage(user.id, topic.id, { text: "first" });
    await new Promise((r) => setTimeout(r, 5));
    await createMessage(user.id, topic.id, { text: "second" });

    const messages = await prismaClient.message.getMessagesForTopic({
      requestingUserId: user.id,
      topicId: topic.id,
      select: { id: true, text: true, createdAt: true },
    });

    expect(messages.map((m) => m.text)).toEqual(["first", "second"]);
  });

  it("returns an empty list when topicId or requestingUserId is missing", async () => {
    await expect(
      prismaClient.message.getMessagesForTopic({
        requestingUserId: undefined,
        topicId: "x",
        select: { text: true },
      }),
    ).resolves.toEqual([]);
  });

  it("decrypts a nested replyTo's text alongside the message's own", async () => {
    const user = await createUser();
    const topic = await createTopic(user.id);
    const original = await createMessage(user.id, topic.id, {
      text: "original text",
    });
    await createMessage(user.id, topic.id, {
      text: "a reply",
      replyToId: original.id,
      threadRootId: original.id,
    });

    const messages = await prismaClient.message.getMessagesForTopic({
      requestingUserId: user.id,
      topicId: topic.id,
      select: {
        id: true,
        text: true,
        createdAt: true,
        threadRootId: true,
        replyTo: { select: { id: true, text: true, createdAt: true } },
      },
    });

    const reply = messages.find((m) => m.text === "a reply");
    expect(reply?.replyTo?.text).toBe("original text");
    expect(reply?.replyCount).toBe(1);
    const root = messages.find((m) => m.id === original.id);
    expect(root?.replyCount).toBe(1);
  });

  it("strips reply quotes that predate their parent (time-travel links)", async () => {
    const user = await createUser();
    const topic = await createTopic(user.id);
    const earlier = new Date("2026-01-01T10:00:00.000Z");
    const later = new Date("2026-01-01T12:00:00.000Z");

    const parentId = crypto.randomUUID();
    const childId = crypto.randomUUID();

    await prismaClient.message.create({
      data: {
        id: parentId,
        userId: user.id,
        topicId: topic.id,
        text: encrypt("parent later", parentId),
        createdAt: later,
        updatedAt: later,
      },
    });
    await prismaClient.message.create({
      data: {
        id: childId,
        userId: user.id,
        topicId: topic.id,
        text: encrypt("child earlier", childId),
        replyToId: parentId,
        threadRootId: parentId,
        createdAt: earlier,
        updatedAt: earlier,
      },
    });

    const messages = await prismaClient.message.getMessagesForTopic({
      requestingUserId: user.id,
      topicId: topic.id,
      select: {
        id: true,
        text: true,
        createdAt: true,
        replyToId: true,
        threadRootId: true,
        replyTo: { select: { id: true, text: true, createdAt: true } },
      },
    });

    const child = messages.find((m) => m.id === childId);
    expect(child?.replyTo).toBeNull();
    expect(child?.replyToId).toBeNull();
    expect(child?.threadRootId).toBeNull();
  });

  it("returns a flat thread via getThreadMessages", async () => {
    const user = await createUser();
    const topic = await createTopic(user.id);
    const original = await createMessage(user.id, topic.id, {
      text: "original text",
    });
    const firstReply = await createMessage(user.id, topic.id, {
      text: "first reply",
      replyToId: original.id,
      threadRootId: original.id,
    });
    await createMessage(user.id, topic.id, {
      text: "nested reply",
      replyToId: firstReply.id,
      threadRootId: original.id,
    });
    await createMessage(user.id, topic.id, { text: "unrelated" });

    const thread = await prismaClient.message.getThreadMessages({
      topicId: topic.id,
      threadRootId: original.id,
      select: { id: true, text: true, threadRootId: true },
    });

    expect(thread[0]?.id).toBe(original.id);
    expect(thread.map((m) => m.text)).toEqual([
      "original text",
      "first reply",
      "nested reply",
    ]);
  });

  it("keeps rapid-fire replies in insertion order, not UUID order", async () => {
    const user = await createUser();
    const topic = await createTopic(user.id);
    const original = await createMessage(user.id, topic.id, {
      text: "root",
    });

    // Same-millisecond createdAt is common under load; UUID id order must
    // not reshuffle send order.
    const sameInstant = new Date();
    const ids: string[] = [];
    for (const text of ["r1", "r2", "r3", "r4", "r5"]) {
      const id = crypto.randomUUID();
      ids.push(id);
      await prismaClient.message.create({
        data: {
          id,
          userId: user.id,
          topicId: topic.id,
          text: encrypt(text, id),
          replyToId: original.id,
          threadRootId: original.id,
          createdAt: sameInstant,
          updatedAt: sameInstant,
        },
      });
    }

    const thread = await prismaClient.message.getThreadMessages({
      topicId: topic.id,
      threadRootId: original.id,
      select: { id: true, text: true },
    });

    expect(thread.map((m) => m.id)).toEqual([original.id, ...ids]);
    expect(thread.map((m) => m.text)).toEqual([
      "root",
      "r1",
      "r2",
      "r3",
      "r4",
      "r5",
    ]);
  });

  it("leaves replyTo as null/undefined when the message isn't a reply", async () => {
    const user = await createUser();
    const topic = await createTopic(user.id);
    await createMessage(user.id, topic.id, { text: "plain" });

    const messages = await prismaClient.message.getMessagesForTopic({
      requestingUserId: user.id,
      topicId: topic.id,
      select: {
        id: true,
        text: true,
        createdAt: true,
        replyTo: { select: { id: true, text: true } },
      },
    });

    expect(messages[0].replyTo).toBeNull();
  });
});

describe("messageModel.getTopHighlightedMessagesForTopic", () => {
  it("returns only messages with at least one highlight, ordered by highlight count", async () => {
    const user = await createUser();
    const topic = await createTopic(user.id);
    await createMessage(user.id, topic.id, { text: "no highlights" });
    const highlighted = await createMessage(user.id, topic.id, {
      text: "highlighted",
    });
    await prismaClient.highlight.create({
      data: { userId: user.id, messageId: highlighted.id },
    });

    const messages =
      await prismaClient.message.getTopHighlightedMessagesForTopic({
        requestingUserId: user.id,
        topicId: topic.id,
        select: { id: true, text: true, highlights: { select: { id: true } } },
      });

    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("highlighted");
    expect(messages.some((m: any) => m.text === "no highlights")).toBe(false);
  });

  it("returns an empty list when topicId or requestingUserId is missing", async () => {
    await expect(
      prismaClient.message.getTopHighlightedMessagesForTopic({
        requestingUserId: undefined,
        topicId: "x",
        select: { text: true, highlights: { select: { id: true } } },
      }),
    ).resolves.toEqual([]);
  });
});

describe("messageModel.getMediaMessagesForTopic", () => {
  it("returns only messages with a mediaUrl", async () => {
    const user = await createUser();
    const topic = await createTopic(user.id);
    await createMessage(user.id, topic.id, { text: "no media" });
    await createMessage(user.id, topic.id, {
      text: "has media",
      mediaUrl: "https://example.com/img.png",
    });

    const messages = await prismaClient.message.getMediaMessagesForTopic({
      requestingUserId: user.id,
      topicId: topic.id,
      select: { id: true, text: true, mediaUrl: true },
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].mediaUrl).toBe("https://example.com/img.png");
  });
});

describe("messageModel.getMostRecentTimestampsByTopic", () => {
  it("returns the latest message timestamp per topic", async () => {
    const user = await createUser();
    const topicA = await createTopic(user.id);
    const topicB = await createTopic(user.id);
    await createMessage(user.id, topicA.id);
    const latestInB = await createMessage(user.id, topicB.id);

    const results = await prismaClient.message.getMostRecentTimestampsByTopic({
      topicIds: [topicA.id, topicB.id],
    });

    const forTopicB = results.find((r) => r.topicId === topicB.id);
    expect(forTopicB?.createdAt).toEqual(latestInB.createdAt);
  });

  it("returns an empty list for an empty topicIds array", async () => {
    await expect(
      prismaClient.message.getMostRecentTimestampsByTopic({ topicIds: [] }),
    ).resolves.toEqual([]);
  });
});
