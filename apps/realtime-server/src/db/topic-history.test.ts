import { beforeEach, describe, it, expect } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { saveTopicHistory } from "./topic-history";

beforeEach(resetDb);

async function createUser() {
  const [user] = await pgClient("users")
    .insert({ id: crypto.randomUUID(), googleId: `google-${crypto.randomUUID()}`, name: "Test User" })
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

describe("saveTopicHistory", () => {
  it("replaces any existing history row for the user/topic pair", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);

    await saveTopicHistory({ userId, topicId });
    await saveTopicHistory({ userId, topicId });

    const rows = await pgClient("topic_histories").where({ userId, topicId });
    expect(rows).toHaveLength(1);
  });
});
