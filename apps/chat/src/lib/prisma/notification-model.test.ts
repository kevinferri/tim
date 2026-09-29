import { beforeEach, describe, it, expect } from "vitest";
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

async function createMessage(userId: string, topicId: string) {
  return prismaClient.message.create({
    data: { userId, topicId, text: "hello" },
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
    const topic = await createTopic(actor.id);
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
        topic: { id: topic.id, name: "Test Topic", circleId: topic.circleId },
      },
    });
    expect(notifications[1].messageId).toBe(messageA.id);
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
    const topic = await createTopic(actor.id);
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
    const topic = await createTopic(actor.id);
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
});

describe("notificationModel.getUnreadCount", () => {
  it("counts only unread notifications for the given user", async () => {
    const recipient = await createUser("Recipient");
    const actor = await createUser("Actor");
    const topic = await createTopic(actor.id);
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
    const topic = await createTopic(actor.id);
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
});
