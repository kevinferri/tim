import { beforeEach, describe, it, expect } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { isUserInCircle, getTopicIdsForCircle, getCircleMembers } from "./circles";

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

describe("isUserInCircle", () => {
  it("returns true when the user is a member of the circle", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);

    await expect(isUserInCircle({ userId, circleId })).resolves.toBe(true);
  });

  it("returns false when the user is not a member", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const circleId = await createCircle(owner);

    await expect(
      isUserInCircle({ userId: outsider, circleId })
    ).resolves.toBe(false);
  });
});

describe("getCircleMembers", () => {
  it("returns every member's id and name", async () => {
    const owner = await createUser();
    const circleId = await createCircle(owner);
    const [otherMember] = await pgClient("users")
      .insert({ id: crypto.randomUUID(), googleId: `google-${crypto.randomUUID()}`, name: "Other Member" })
      .returning(["id"]);
    await pgClient("_circleMembershipsForUser").insert({ A: circleId, B: otherMember.id });

    const members = await getCircleMembers({ circleId });

    expect(members.map((m) => m.id).sort()).toEqual([owner, otherMember.id].sort());
    expect(members.find((m) => m.id === otherMember.id)?.name).toBe("Other Member");
  });
});

describe("getTopicIdsForCircle", () => {
  it("returns every topic belonging to the circle", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);
    const otherCircleId = await createCircle(userId);
    await createTopic(userId, otherCircleId);

    const topics = await getTopicIdsForCircle({ circleId });

    expect(topics).toEqual([{ id: topicId }]);
  });
});
