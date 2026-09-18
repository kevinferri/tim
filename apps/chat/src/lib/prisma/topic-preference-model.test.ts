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

async function createCircleWithTopics(ownerId: string, topicCount = 2) {
  const circle = await prismaClient.circle.create({
    data: {
      name: "Test Circle",
      userId: ownerId,
      members: { connect: [{ id: ownerId }] },
    },
  });

  const topics = [];
  for (let i = 0; i < topicCount; i++) {
    topics.push(
      await prismaClient.topic.create({
        data: { name: `Topic ${i}`, userId: ownerId, circleId: circle.id },
      }),
    );
  }

  return { circle, topics };
}

describe("topicPreferenceModel.getAllForUserAndCircle", () => {
  it("returns only preference rows for topics in the given circle", async () => {
    const owner = await createUser();
    const { circle: circleA, topics: topicsA } = await createCircleWithTopics(
      owner.id,
      1,
    );
    const { topics: topicsB } = await createCircleWithTopics(owner.id, 1);

    await prismaClient.topicPreference.create({
      data: { userId: owner.id, topicId: topicsA[0].id, order: 0 },
    });
    await prismaClient.topicPreference.create({
      data: { userId: owner.id, topicId: topicsB[0].id, order: 0 },
    });

    const rows = await prismaClient.topicPreference.getAllForUserAndCircle({
      userId: owner.id,
      circleId: circleA.id,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].topicId).toBe(topicsA[0].id);
  });

  it("returns an empty list when userId is missing", async () => {
    await expect(
      prismaClient.topicPreference.getAllForUserAndCircle({
        userId: undefined,
        circleId: "some-circle",
      }),
    ).resolves.toEqual([]);
  });
});

describe("topicPreferenceModel.reorderForUser", () => {
  it("persists order for each topic id in the given position", async () => {
    const owner = await createUser();
    const { circle, topics } = await createCircleWithTopics(owner.id, 3);

    const success = await prismaClient.topicPreference.reorderForUser({
      userId: owner.id,
      circleId: circle.id,
      orderedTopicIds: [topics[2].id, topics[0].id, topics[1].id],
    });

    expect(success).toBe(true);

    const rows = await prismaClient.topicPreference.findMany({
      where: { userId: owner.id },
    });
    const orderByTopic = Object.fromEntries(
      rows.map((row) => [row.topicId, row.order]),
    );

    expect(orderByTopic[topics[2].id]).toBe(0);
    expect(orderByTopic[topics[0].id]).toBe(1000);
    expect(orderByTopic[topics[1].id]).toBe(2000);
  });

  it("updates order in place on a subsequent reorder rather than duplicating rows", async () => {
    const owner = await createUser();
    const { circle, topics } = await createCircleWithTopics(owner.id, 2);

    await prismaClient.topicPreference.reorderForUser({
      userId: owner.id,
      circleId: circle.id,
      orderedTopicIds: [topics[0].id, topics[1].id],
    });
    await prismaClient.topicPreference.reorderForUser({
      userId: owner.id,
      circleId: circle.id,
      orderedTopicIds: [topics[1].id, topics[0].id],
    });

    const rows = await prismaClient.topicPreference.findMany({
      where: { userId: owner.id },
    });

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.topicId === topics[1].id)?.order).toBe(0);
    expect(rows.find((r) => r.topicId === topics[0].id)?.order).toBe(1000);
  });

  it("rejects a user who isn't a member of the circle", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const { circle, topics } = await createCircleWithTopics(owner.id, 1);

    const success = await prismaClient.topicPreference.reorderForUser({
      userId: outsider.id,
      circleId: circle.id,
      orderedTopicIds: [topics[0].id],
    });

    expect(success).toBe(false);
    await expect(
      prismaClient.topicPreference.findMany({ where: { userId: outsider.id } }),
    ).resolves.toEqual([]);
  });

  it("filters out ids for topics outside the given circle instead of persisting them", async () => {
    const owner = await createUser();
    const { circle: circleA, topics: topicsA } = await createCircleWithTopics(
      owner.id,
      1,
    );
    const { topics: topicsB } = await createCircleWithTopics(owner.id, 1);

    const success = await prismaClient.topicPreference.reorderForUser({
      userId: owner.id,
      circleId: circleA.id,
      orderedTopicIds: [topicsA[0].id, topicsB[0].id],
    });

    expect(success).toBe(true);

    const rows = await prismaClient.topicPreference.findMany({
      where: { userId: owner.id },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].topicId).toBe(topicsA[0].id);
  });

  it("returns false when every id is filtered out as invalid", async () => {
    const owner = await createUser();
    const { circle: circleA } = await createCircleWithTopics(owner.id, 0);
    const { topics: topicsB } = await createCircleWithTopics(owner.id, 1);

    const success = await prismaClient.topicPreference.reorderForUser({
      userId: owner.id,
      circleId: circleA.id,
      orderedTopicIds: [topicsB[0].id],
    });

    expect(success).toBe(false);
  });
});

describe("topicPreferenceModel.setMutedForUser", () => {
  it("creates a preference row when none exists yet", async () => {
    const owner = await createUser();
    const { circle, topics } = await createCircleWithTopics(owner.id, 1);

    const success = await prismaClient.topicPreference.setMutedForUser({
      userId: owner.id,
      circleId: circle.id,
      topicId: topics[0].id,
      isMuted: true,
    });

    expect(success).toBe(true);

    const row = await prismaClient.topicPreference.findUnique({
      where: { userId_topicId: { userId: owner.id, topicId: topics[0].id } },
    });
    expect(row?.isMuted).toBe(true);
  });

  it("updates isMuted without disturbing an existing order value", async () => {
    const owner = await createUser();
    const { circle, topics } = await createCircleWithTopics(owner.id, 1);

    await prismaClient.topicPreference.create({
      data: { userId: owner.id, topicId: topics[0].id, order: 42 },
    });

    await prismaClient.topicPreference.setMutedForUser({
      userId: owner.id,
      circleId: circle.id,
      topicId: topics[0].id,
      isMuted: true,
    });

    const row = await prismaClient.topicPreference.findUnique({
      where: { userId_topicId: { userId: owner.id, topicId: topics[0].id } },
    });
    expect(row?.isMuted).toBe(true);
    expect(row?.order).toBe(42);
  });

  it("rejects a user who isn't a member of the circle", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const { circle, topics } = await createCircleWithTopics(owner.id, 1);

    const success = await prismaClient.topicPreference.setMutedForUser({
      userId: outsider.id,
      circleId: circle.id,
      topicId: topics[0].id,
      isMuted: true,
    });

    expect(success).toBe(false);
  });

  it("rejects a topic id that doesn't belong to the given circle", async () => {
    const owner = await createUser();
    const { circle: circleA } = await createCircleWithTopics(owner.id, 0);
    const { topics: topicsB } = await createCircleWithTopics(owner.id, 1);

    const success = await prismaClient.topicPreference.setMutedForUser({
      userId: owner.id,
      circleId: circleA.id,
      topicId: topicsB[0].id,
      isMuted: true,
    });

    expect(success).toBe(false);
  });
});
