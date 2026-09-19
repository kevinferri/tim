import { beforeEach, describe, it, expect } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { markTopicRead } from "./topic-read-state";

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

describe("markTopicRead", () => {
  it("keeps a single row per user/topic pair and advances lastReadAt", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);

    await markTopicRead({ userId, topicId });
    const [first] = await pgClient("topic_read_states").where({
      userId,
      topicId,
    });
    await new Promise((r) => setTimeout(r, 5));
    await markTopicRead({ userId, topicId });

    const rows = await pgClient("topic_read_states").where({ userId, topicId });
    expect(rows).toHaveLength(1);
    expect(rows[0].lastReadAt.getTime()).toBeGreaterThan(
      first.lastReadAt.getTime(),
    );
  });

  it("returns false instead of throwing when the topic no longer exists", async () => {
    const userId = await createUser();

    await expect(
      markTopicRead({ userId, topicId: crypto.randomUUID() }),
    ).resolves.toBe(false);
  });
});
