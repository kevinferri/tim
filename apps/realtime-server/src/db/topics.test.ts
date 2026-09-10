import { beforeEach, describe, it, expect } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { isUserInTopic, getParentCircleIdForTopic, getTopicSummary } from "./topics";

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
  await pgClient("_circleMembershipsForUser").insert({ A: circle.id, B: userId });
  return circle.id as string;
}

async function createTopic(userId: string, circleId: string) {
  const [topic] = await pgClient("topics")
    .insert({ id: crypto.randomUUID(), name: "Test Topic", userId, circleId })
    .returning(["id"]);
  return topic.id as string;
}

describe("isUserInTopic", () => {
  it("returns true when the user is a member of the topic's parent circle", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);

    await expect(isUserInTopic({ userId, topicId })).resolves.toBe(true);
  });

  it("returns false when the user is not a member of the parent circle", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const circleId = await createCircle(owner);
    const topicId = await createTopic(owner, circleId);

    await expect(isUserInTopic({ userId: outsider, topicId })).resolves.toBe(false);
  });

  it("returns false for a nonexistent topic", async () => {
    const userId = await createUser();

    await expect(
      isUserInTopic({ userId, topicId: crypto.randomUUID() })
    ).resolves.toBe(false);
  });
});

describe("getParentCircleIdForTopic", () => {
  it("returns the circle a topic belongs to", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);

    await expect(
      getParentCircleIdForTopic({ topicId })
    ).resolves.toEqual({ id: circleId });
  });
});

describe("getTopicSummary", () => {
  it("returns the topic's id and name", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);

    await expect(getTopicSummary({ topicId })).resolves.toEqual({
      id: topicId,
      name: "Test Topic",
    });
  });

  it("returns undefined for a nonexistent topic", async () => {
    await expect(
      getTopicSummary({ topicId: crypto.randomUUID() })
    ).resolves.toBeUndefined();
  });
});
