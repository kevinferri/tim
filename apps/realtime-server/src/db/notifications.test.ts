import { beforeEach, describe, it, expect } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { writeMessage } from "./messages";
import { createNotification } from "./notifications";

beforeEach(resetDb);

async function createUser(name: string) {
  const [user] = await pgClient("users")
    .insert({
      id: crypto.randomUUID(),
      googleId: `google-${crypto.randomUUID()}`,
      name,
    })
    .returning(["id"]);
  return user.id as string;
}

async function createCircle(userId: string) {
  const [circle] = await pgClient("circles")
    .insert({ id: crypto.randomUUID(), name: "Test Circle", userId })
    .returning(["id"]);
  return circle.id as string;
}

async function createTopic(userId: string, circleId: string) {
  const [topic] = await pgClient("topics")
    .insert({ id: crypto.randomUUID(), name: "Test Topic", userId, circleId })
    .returning(["id"]);
  return topic.id as string;
}

async function createMessage(userId: string, topicId: string) {
  return writeMessage({
    userId,
    topicId,
    text: "hello",
    mediaUrl: undefined as any,
  });
}

describe("createNotification", () => {
  it("inserts a row matching the notifications table shape", async () => {
    const actorId = await createUser("Actor");
    const recipientId = await createUser("Recipient");
    const circleId = await createCircle(actorId);
    const topicId = await createTopic(actorId, circleId);
    const message = await createMessage(actorId, topicId);

    await createNotification({
      type: "mention:received",
      recipientId,
      actorId,
      messageId: message.id,
    });

    const row = await pgClient("notifications")
      .where({ recipientId, messageId: message.id })
      .first();

    expect(row).toMatchObject({
      type: "mention:received",
      recipientId,
      actorId,
      messageId: message.id,
      readAt: null,
    });
    expect(row.id).toBeTruthy();
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it("rejects a messageId that doesn't exist", async () => {
    const actorId = await createUser("Actor");
    const recipientId = await createUser("Recipient");

    await expect(
      createNotification({
        type: "mention:received",
        recipientId,
        actorId,
        messageId: crypto.randomUUID(),
      }),
    ).rejects.toThrow();
  });

  it("is removed when its message is deleted (cascade)", async () => {
    const actorId = await createUser("Actor");
    const recipientId = await createUser("Recipient");
    const circleId = await createCircle(actorId);
    const topicId = await createTopic(actorId, circleId);
    const message = await createMessage(actorId, topicId);

    await createNotification({
      type: "mention:received",
      recipientId,
      actorId,
      messageId: message.id,
    });

    await pgClient("messages").where({ id: message.id }).del();

    await expect(
      pgClient("notifications").where({ messageId: message.id }).first(),
    ).resolves.toBeUndefined();
  });
});
