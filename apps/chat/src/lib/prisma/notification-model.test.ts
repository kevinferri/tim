import { beforeEach, describe, it, expect } from "vitest";
import { encrypt } from "@tim/crypto";
import { prismaClient, resetDb } from "@/test/db";

beforeEach(resetDb);

async function createUser(name = "Test User") {
  return prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name,
      email: `${crypto.randomUUID()}@example.com`,
    },
  });
}

async function createTopic(ownerId: string, extraMemberIds: string[] = []) {
  const circle = await prismaClient.circle.create({
    data: {
      name: "Test Circle",
      userId: ownerId,
      members: {
        connect: [ownerId, ...extraMemberIds].map((id) => ({ id })),
      },
    },
  });
  return prismaClient.topic.create({
    data: { name: "Test Topic", userId: ownerId, circleId: circle.id },
  });
}

async function createMessage(
  userId: string,
  topicId: string,
  text: string | null = "hello",
) {
  const id = crypto.randomUUID();
  return prismaClient.message.create({
    data: { id, userId, topicId, text: text ? encrypt(text, id) : null },
  });
}

async function createNotification({
  recipientId,
  actorId,
  messageId,
  type = "mention:received",
  readAt,
}: {
  recipientId: string;
  actorId: string;
  messageId: string;
  type?: string;
  readAt?: Date;
}) {
  return prismaClient.notification.create({
    data: { recipientId, actorId, messageId, type, readAt },
  });
}

describe("notificationModel.getForUser", () => {
  it("returns the recipient's notifications, newest first, with actor and message shape", async () => {
    const recipient = await createUser("Recipient");
    const actor = await createUser("Actor");
    const topic = await createTopic(actor.id, [recipient.id]);
    const messageA = await createMessage(actor.id, topic.id);
    const messageB = await createMessage(actor.id, topic.id);

    await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: messageA.id,
    });
    await new Promise((r) => setTimeout(r, 5));
    await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: messageB.id,
      type: "highlight:recieved",
    });

    const notifications = await prismaClient.notification.getForUser({
      userId: recipient.id,
    });

    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toMatchObject({
      type: "highlight:recieved",
      messageId: messageB.id,
      readAt: null,
      actor: { id: actor.id, name: "Actor" },
      message: {
        topicId: topic.id,
        text: "hello",
        mediaUrl: null,
        topic: { id: topic.id, name: "Test Topic", circleId: topic.circleId },
      },
    });
    expect(notifications[1].messageId).toBe(messageA.id);
  });

  it("returns null message text for a media-only message, without erroring", async () => {
    const recipient = await createUser("Recipient");
    const actor = await createUser("Actor");
    const topic = await createTopic(actor.id, [recipient.id]);
    const message = await createMessage(actor.id, topic.id, null);
    await prismaClient.message.update({
      where: { id: message.id },
      data: { mediaUrl: "https://example.com/cat.gif" },
    });

    await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
    });

    const [notification] = await prismaClient.notification.getForUser({
      userId: recipient.id,
    });

    expect(notification.message.text).toBeNull();
    expect(notification.message.mediaUrl).toBe("https://example.com/cat.gif");
  });

  it("only returns notifications for the requesting recipient", async () => {
    const recipient = await createUser("Recipient");
    const other = await createUser("Other");
    const actor = await createUser("Actor");
    const topic = await createTopic(actor.id);
    const message = await createMessage(actor.id, topic.id);

    await createNotification({
      recipientId: other.id,
      actorId: actor.id,
      messageId: message.id,
    });

    await expect(
      prismaClient.notification.getForUser({ userId: recipient.id }),
    ).resolves.toEqual([]);
  });

  it("paginates via the before cursor", async () => {
    const recipient = await createUser("Recipient");
    const actor = await createUser("Actor");
    const topic = await createTopic(actor.id, [recipient.id]);
    const messageA = await createMessage(actor.id, topic.id);
    const messageB = await createMessage(actor.id, topic.id);

    const older = await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: messageA.id,
    });
    await new Promise((r) => setTimeout(r, 5));
    const newer = await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: messageB.id,
    });

    const page = await prismaClient.notification.getForUser({
      userId: recipient.id,
      before: newer.id,
    });

    expect(page).toHaveLength(1);
    expect(page[0].id).toBe(older.id);
  });

  it("doesn't skip a sibling notification that ties on createdAt", async () => {
    const recipient = await createUser("Recipient");
    const actor = await createUser("Actor");
    const topic = await createTopic(actor.id, [recipient.id]);
    const message = await createMessage(actor.id, topic.id);

    const older = await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
    });

    // Same createdAt on purpose -- simulates e.g. one message mentioning
    // several people, which creates several notifications within the same
    // millisecond via Promise.all. A createdAt-only cursor would jump past
    // the whole tied group and drop whichever one wasn't the pivot.
    const tiedAt = new Date(older.createdAt.getTime() + 1000);
    const tiedData = {
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
      type: "mention:received",
      createdAt: tiedAt,
    };
    const tiedFirst = await prismaClient.notification.create({
      data: tiedData,
    });
    const tiedSecond = await prismaClient.notification.create({
      data: tiedData,
    });

    // orderBy is [createdAt desc, id desc], so whichever tied row has the
    // larger id sorts first -- that's the one we'll page past.
    const [ahead, behind] =
      tiedFirst.id > tiedSecond.id
        ? [tiedFirst, tiedSecond]
        : [tiedSecond, tiedFirst];

    const page = await prismaClient.notification.getForUser({
      userId: recipient.id,
      before: ahead.id,
    });

    const ids = page.map((n) => n.id);
    expect(ids).toHaveLength(2);
    expect(ids).toContain(behind.id);
    expect(ids).toContain(older.id);
  });

  it("returns an empty array when userId is missing", async () => {
    await expect(
      prismaClient.notification.getForUser({ userId: undefined }),
    ).resolves.toEqual([]);
  });

  it("returns an empty array for a cursor id that doesn't exist", async () => {
    const recipient = await createUser("Recipient");

    await expect(
      prismaClient.notification.getForUser({
        userId: recipient.id,
        before: crypto.randomUUID(),
      }),
    ).resolves.toEqual([]);
  });

  it("returns an empty array for a cursor id belonging to another user's notification", async () => {
    const recipient = await createUser("Recipient");
    const other = await createUser("Other");
    const actor = await createUser("Actor");
    const topic = await createTopic(actor.id);
    const message = await createMessage(actor.id, topic.id);

    // A notification that exists, but isn't the requesting user's -- the
    // naive fix (Prisma's own `cursor` option) would still anchor off it,
    // since that option ignores `where` when locating the cursor row.
    const foreign = await createNotification({
      recipientId: other.id,
      actorId: actor.id,
      messageId: message.id,
    });
    await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
    });

    await expect(
      prismaClient.notification.getForUser({
        userId: recipient.id,
        before: foreign.id,
      }),
    ).resolves.toEqual([]);
  });

  it("excludes notifications for a circle the recipient has since left", async () => {
    const actor = await createUser("Actor");
    const recipient = await createUser("Recipient");
    const topic = await createTopic(actor.id);
    const message = await createMessage(actor.id, topic.id);

    await prismaClient.circle.update({
      where: { id: topic.circleId },
      data: { members: { connect: [{ id: recipient.id }] } },
    });

    const notification = await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
    });

    await prismaClient.circle.update({
      where: { id: topic.circleId },
      data: { members: { disconnect: [{ id: recipient.id }] } },
    });

    await expect(
      prismaClient.notification.getForUser({ userId: recipient.id }),
    ).resolves.toEqual([]);

    // Also can't be used as a pagination cursor once it's excluded --
    // consistent with the unknown/foreign cursor cases above.
    await expect(
      prismaClient.notification.getForUser({
        userId: recipient.id,
        before: notification.id,
      }),
    ).resolves.toEqual([]);
  });
});

describe("notificationModel.getUnreadCount", () => {
  it("counts only unread notifications for the given user", async () => {
    const recipient = await createUser("Recipient");
    const actor = await createUser("Actor");
    const topic = await createTopic(actor.id, [recipient.id]);
    const message = await createMessage(actor.id, topic.id);

    await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
    });
    await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
      readAt: new Date(),
    });

    await expect(
      prismaClient.notification.getUnreadCount({ userId: recipient.id }),
    ).resolves.toBe(1);
  });

  it("returns 0 when userId is missing", async () => {
    await expect(
      prismaClient.notification.getUnreadCount({ userId: undefined }),
    ).resolves.toBe(0);
  });
});

describe("notificationModel.markAllReadForUser", () => {
  it("marks every unread notification for the user as read, without touching other users'", async () => {
    const recipient = await createUser("Recipient");
    const other = await createUser("Other");
    const actor = await createUser("Actor");
    const topic = await createTopic(actor.id, [recipient.id, other.id]);
    const message = await createMessage(actor.id, topic.id);

    await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
    });
    await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
    });
    await createNotification({
      recipientId: other.id,
      actorId: actor.id,
      messageId: message.id,
    });

    const result = await prismaClient.notification.markAllReadForUser({
      userId: recipient.id,
    });

    expect(result.count).toBe(2);
    await expect(
      prismaClient.notification.getUnreadCount({ userId: recipient.id }),
    ).resolves.toBe(0);
    await expect(
      prismaClient.notification.getUnreadCount({ userId: other.id }),
    ).resolves.toBe(1);
  });

  it("is a no-op when userId is missing", async () => {
    await expect(
      prismaClient.notification.markAllReadForUser({ userId: undefined }),
    ).resolves.toEqual({ count: 0 });
  });

  it("doesn't mark a left-circle notification read, so it's still unread if the user rejoins", async () => {
    const actor = await createUser("Actor");
    const recipient = await createUser("Recipient");
    const topic = await createTopic(actor.id, [recipient.id]);
    const message = await createMessage(actor.id, topic.id);

    await createNotification({
      recipientId: recipient.id,
      actorId: actor.id,
      messageId: message.id,
    });

    await prismaClient.circle.update({
      where: { id: topic.circleId },
      data: { members: { disconnect: [{ id: recipient.id }] } },
    });

    const result = await prismaClient.notification.markAllReadForUser({
      userId: recipient.id,
    });
    expect(result.count).toBe(0);

    await prismaClient.circle.update({
      where: { id: topic.circleId },
      data: { members: { connect: [{ id: recipient.id }] } },
    });

    await expect(
      prismaClient.notification.getUnreadCount({ userId: recipient.id }),
    ).resolves.toBe(1);
  });
});

describe("notificationModel.countMentionsReceivedByUser / countMentionsSentByUser", () => {
  it("counts only mention notifications, by recipient and by actor", async () => {
    const alice = await createUser("Alice");
    const bob = await createUser("Bob");
    const topic = await createTopic(alice.id, [bob.id]);
    const message = await createMessage(alice.id, topic.id);

    await createNotification({
      recipientId: bob.id,
      actorId: alice.id,
      messageId: message.id,
    });
    await createNotification({
      recipientId: bob.id,
      actorId: alice.id,
      messageId: message.id,
    });
    await createNotification({
      recipientId: bob.id,
      actorId: alice.id,
      messageId: message.id,
      type: "reply:received",
    });

    await expect(
      prismaClient.notification.countMentionsReceivedByUser({ userId: bob.id }),
    ).resolves.toBe(2);
    await expect(
      prismaClient.notification.countMentionsSentByUser({ userId: alice.id }),
    ).resolves.toBe(2);
    await expect(
      prismaClient.notification.countMentionsSentByUser({ userId: bob.id }),
    ).resolves.toBe(0);
  });
});
