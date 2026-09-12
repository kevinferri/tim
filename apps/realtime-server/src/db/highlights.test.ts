import { beforeEach, describe, it, expect } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { writeMessage } from "./messages";
import { toggleHighlight } from "./highlights";

beforeEach(resetDb);

async function createUser() {
  const [user] = await pgClient("users")
    .insert({
      id: crypto.randomUUID(),
      googleId: `google-${crypto.randomUUID()}`,
      name: "Test User",
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

describe("toggleHighlight", () => {
  it("creates a highlight when none exists, then removes it on a second call", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);
    const message = await createMessage(userId, topicId);

    const created = await toggleHighlight({ userId, messageId: message.id });
    expect(created).toMatchObject({ userId, messageId: message.id });

    await toggleHighlight({ userId, messageId: message.id });

    await expect(
      pgClient("highlights").where("messageId", message.id).first(),
    ).resolves.toBeUndefined();
  });
});
