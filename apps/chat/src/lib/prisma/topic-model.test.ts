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

async function createCircle(ownerId: string, memberIds: string[] = []) {
  return prismaClient.circle.create({
    data: {
      name: "Test Circle",
      userId: ownerId,
      members: {
        connect: [{ id: ownerId }, ...memberIds.map((id) => ({ id }))],
      },
    },
  });
}

async function createTopic(
  ownerId: string,
  circleId: string,
  name = "Test Topic",
) {
  return prismaClient.topic.create({
    data: { name, userId: ownerId, circleId },
  });
}

describe("topicModel.getAllForCircleAndUser", () => {
  it("returns topics in the circle when the user is a member", async () => {
    const owner = await createUser();
    const circle = await createCircle(owner.id);
    await createTopic(owner.id, circle.id, "Topic A");

    const topics = await prismaClient.topic.getAllForCircleAndUser({
      userId: owner.id,
      circleId: circle.id,
      select: { name: true },
    });

    expect(topics).toEqual([{ name: "Topic A" }]);
  });

  it("returns an empty list for a non-member", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const circle = await createCircle(owner.id);
    await createTopic(owner.id, circle.id);

    const topics = await prismaClient.topic.getAllForCircleAndUser({
      userId: outsider.id,
      circleId: circle.id,
      select: { name: true },
    });

    expect(topics).toEqual([]);
  });

  it("returns undefined when userId or circleId is missing", async () => {
    await expect(
      prismaClient.topic.getAllForCircleAndUser({
        userId: undefined,
        circleId: "x",
        select: { name: true },
      }),
    ).resolves.toBeUndefined();
  });
});

describe("topicModel.isUserInTopic", () => {
  it("returns true when the user is in the topic's parent circle", async () => {
    const owner = await createUser();
    const circle = await createCircle(owner.id);
    const topic = await createTopic(owner.id, circle.id);

    await expect(
      prismaClient.topic.isUserInTopic({ userId: owner.id, topicId: topic.id }),
    ).resolves.toBe(true);
  });

  it("returns false when the user is not in the parent circle", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const circle = await createCircle(owner.id);
    const topic = await createTopic(owner.id, circle.id);

    await expect(
      prismaClient.topic.isUserInTopic({
        userId: outsider.id,
        topicId: topic.id,
      }),
    ).resolves.toBe(false);
  });

  it("returns false for a nonexistent topic", async () => {
    const owner = await createUser();

    await expect(
      prismaClient.topic.isUserInTopic({
        userId: owner.id,
        topicId: crypto.randomUUID(),
      }),
    ).resolves.toBe(false);
  });
});

describe("topicModel.upsertForUser", () => {
  it("creates a topic and topic-history rows for every circle member", async () => {
    const owner = await createUser();
    const member = await createUser();
    const circle = await createCircle(owner.id, [member.id]);

    const result = await prismaClient.topic.upsertForUser({
      userId: owner.id,
      circleId: circle.id,
      topicId: null,
      name: "New Topic",
      description: null,
    });

    expect(result).not.toBe(false);
    if (result === false) return;

    expect(result.data.name).toBe("New Topic");

    const histories = await prismaClient.topicHistory.findMany({
      where: { topicId: result.data.id },
    });
    expect(histories.map((h) => h.userId).sort()).toEqual(
      [owner.id, member.id].sort(),
    );
  });

  it("refuses to create a topic when the user isn't in the circle", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const circle = await createCircle(owner.id);

    const result = await prismaClient.topic.upsertForUser({
      userId: outsider.id,
      circleId: circle.id,
      topicId: null,
      name: "New Topic",
      description: null,
    });

    expect(result).toBe(false);
  });

  it("refuses to update a topic the user didn't create", async () => {
    const owner = await createUser();
    const otherMember = await createUser();
    const circle = await createCircle(owner.id, [otherMember.id]);
    const topic = await createTopic(owner.id, circle.id);

    const result = await prismaClient.topic.upsertForUser({
      userId: otherMember.id,
      circleId: circle.id,
      topicId: topic.id,
      name: "Hijacked",
      description: null,
    });

    expect(result).toBe(false);
  });
});

describe("topicModel.getNameWithMemberIds", () => {
  it("returns the topic name and its parent circle's member ids", async () => {
    const owner = await createUser();
    const member = await createUser();
    const circle = await createCircle(owner.id, [member.id]);
    const topic = await createTopic(owner.id, circle.id, "My Topic");

    const result = await prismaClient.topic.getNameWithMemberIds({
      topicId: topic.id,
    });

    expect(result?.name).toBe("My Topic");
    expect(result?.memberIds.sort()).toEqual([owner.id, member.id].sort());
  });

  it("returns undefined for a nonexistent topic", async () => {
    await expect(
      prismaClient.topic.getNameWithMemberIds({ topicId: crypto.randomUUID() }),
    ).resolves.toBeUndefined();
  });
});

describe("topicModel.deleteByIdForUser", () => {
  it("deletes a topic owned by the user", async () => {
    const owner = await createUser();
    const circle = await createCircle(owner.id);
    const topic = await createTopic(owner.id, circle.id);

    const result = await prismaClient.topic.deleteByIdForUser({
      userId: owner.id,
      topicId: topic.id,
      circleId: circle.id,
    });

    expect(result).not.toBe(false);
    await expect(
      prismaClient.topic.findUnique({ where: { id: topic.id } }),
    ).resolves.toBeNull();
  });

  it("refuses to delete a topic the user doesn't own", async () => {
    const owner = await createUser();
    const otherMember = await createUser();
    const circle = await createCircle(owner.id, [otherMember.id]);
    const topic = await createTopic(owner.id, circle.id);

    const result = await prismaClient.topic.deleteByIdForUser({
      userId: otherMember.id,
      topicId: topic.id,
      circleId: circle.id,
    });

    expect(result).toBe(false);
    await expect(
      prismaClient.topic.findUnique({ where: { id: topic.id } }),
    ).resolves.not.toBeNull();
  });
});
