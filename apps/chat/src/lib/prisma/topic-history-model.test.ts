import { beforeEach, describe, it, expect } from "vitest";
import { prismaClient, resetDb } from "@/test/db";

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
    data: { name: "Test Circle", userId: ownerId, members: { connect: [{ id: ownerId }] } },
  });
  return prismaClient.topic.create({
    data: { name: "Test Topic", userId: ownerId, circleId: circle.id },
  });
}

describe("topicHistoryModel.createManyForUsers", () => {
  it("creates a history row per user id", async () => {
    const owner = await createUser();
    const member = await createUser();
    const topic = await createTopic(owner.id);

    await prismaClient.topicHistory.createManyForUsers({
      topicId: topic.id,
      userIds: [owner.id, member.id],
    });

    const rows = await prismaClient.topicHistory.findMany({ where: { topicId: topic.id } });
    expect(rows.map((r) => r.userId).sort()).toEqual([owner.id, member.id].sort());
  });

  it("is a no-op for an empty user list", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);

    await prismaClient.topicHistory.createManyForUsers({ topicId: topic.id, userIds: [] });

    await expect(
      prismaClient.topicHistory.findMany({ where: { topicId: topic.id } })
    ).resolves.toEqual([]);
  });
});

describe("topicHistoryModel.getMostRecentForUser", () => {
  it("returns the most recently created history row for the user", async () => {
    const owner = await createUser();
    const topicA = await createTopic(owner.id);
    const topicB = await createTopic(owner.id);

    await prismaClient.topicHistory.create({ data: { userId: owner.id, topicId: topicA.id } });
    await new Promise((r) => setTimeout(r, 5));
    await prismaClient.topicHistory.create({ data: { userId: owner.id, topicId: topicB.id } });

    const result = await prismaClient.topicHistory.getMostRecentForUser({ userId: owner.id });

    expect(result?.topicId).toBe(topicB.id);
  });

  it("returns undefined when userId is missing", async () => {
    await expect(
      prismaClient.topicHistory.getMostRecentForUser({ userId: undefined })
    ).resolves.toBeUndefined();
  });
});

describe("topicHistoryModel.getAllForUser", () => {
  it("returns every history row for the user", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);
    await prismaClient.topicHistory.create({ data: { userId: owner.id, topicId: topic.id } });

    const rows = await prismaClient.topicHistory.getAllForUser({ userId: owner.id });

    expect(rows).toHaveLength(1);
    expect(rows[0].topicId).toBe(topic.id);
  });

  it("returns an empty list when userId is missing", async () => {
    await expect(
      prismaClient.topicHistory.getAllForUser({ userId: undefined })
    ).resolves.toEqual([]);
  });
});

describe("topicHistoryModel.getAllForUserAndCircle", () => {
  it("returns only history rows for topics in the given circle", async () => {
    const owner = await createUser();
    const topicInCircle = await createTopic(owner.id);
    const topicInOtherCircle = await createTopic(owner.id);

    await prismaClient.topicHistory.create({
      data: { userId: owner.id, topicId: topicInCircle.id },
    });
    await prismaClient.topicHistory.create({
      data: { userId: owner.id, topicId: topicInOtherCircle.id },
    });

    const rows = await prismaClient.topicHistory.getAllForUserAndCircle({
      userId: owner.id,
      circleId: topicInCircle.circleId,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].topicId).toBe(topicInCircle.id);
  });

  it("returns an empty list when userId is missing", async () => {
    await expect(
      prismaClient.topicHistory.getAllForUserAndCircle({
        userId: undefined,
        circleId: "some-circle",
      })
    ).resolves.toEqual([]);
  });
});

describe("topicHistoryModel.getUnreadTopicIds", () => {
  it("flags a topic as unread when its most recent message postdates the user's history", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);

    await prismaClient.topicHistory.create({
      data: { userId: owner.id, topicId: topic.id },
    });
    await new Promise((r) => setTimeout(r, 5));
    await prismaClient.message.create({
      data: { userId: owner.id, topicId: topic.id, text: "hello" },
    });

    const unread = await prismaClient.topicHistory.getUnreadTopicIds({
      userId: owner.id,
      circleId: topic.circleId,
      topicIds: [topic.id],
    });

    expect(unread).toEqual({ [topic.id]: true });
  });

  it("does not flag a topic the user has already seen the latest message in", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);

    await prismaClient.message.create({
      data: { userId: owner.id, topicId: topic.id, text: "hello" },
    });
    await new Promise((r) => setTimeout(r, 5));
    await prismaClient.topicHistory.create({
      data: { userId: owner.id, topicId: topic.id },
    });

    const unread = await prismaClient.topicHistory.getUnreadTopicIds({
      userId: owner.id,
      circleId: topic.circleId,
      topicIds: [topic.id],
    });

    expect(unread).toEqual({});
  });

  it("returns an empty map when userId or topicIds is missing/empty", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);

    await expect(
      prismaClient.topicHistory.getUnreadTopicIds({
        userId: undefined,
        circleId: topic.circleId,
        topicIds: [topic.id],
      })
    ).resolves.toEqual({});

    await expect(
      prismaClient.topicHistory.getUnreadTopicIds({
        userId: owner.id,
        circleId: topic.circleId,
        topicIds: [],
      })
    ).resolves.toEqual({});
  });
});

describe("topicHistoryModel.deleteForTopicAndUser", () => {
  it("deletes matching history rows", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);
    await prismaClient.topicHistory.create({ data: { userId: owner.id, topicId: topic.id } });

    await prismaClient.topicHistory.deleteForTopicAndUser({ userId: owner.id, topicId: topic.id });

    await expect(
      prismaClient.topicHistory.findMany({ where: { userId: owner.id, topicId: topic.id } })
    ).resolves.toEqual([]);
  });

  it("is a no-op when topicId or userId is missing", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);
    await prismaClient.topicHistory.create({ data: { userId: owner.id, topicId: topic.id } });

    await prismaClient.topicHistory.deleteForTopicAndUser({ userId: undefined, topicId: topic.id });

    await expect(
      prismaClient.topicHistory.findMany({ where: { topicId: topic.id } })
    ).resolves.toHaveLength(1);
  });
});
