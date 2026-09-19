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

describe("topicReadStateModel.createManyForUsers", () => {
  it("creates a read-state row per user id", async () => {
    const owner = await createUser();
    const member = await createUser();
    const topic = await createTopic(owner.id);

    await prismaClient.topicReadState.createManyForUsers({
      topicId: topic.id,
      userIds: [owner.id, member.id],
    });

    const rows = await prismaClient.topicReadState.findMany({
      where: { topicId: topic.id },
    });
    expect(rows.map((r) => r.userId).sort()).toEqual(
      [owner.id, member.id].sort(),
    );
  });

  it("is a no-op for an empty user list", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);

    await prismaClient.topicReadState.createManyForUsers({
      topicId: topic.id,
      userIds: [],
    });

    await expect(
      prismaClient.topicReadState.findMany({ where: { topicId: topic.id } }),
    ).resolves.toEqual([]);
  });
});

describe("topicReadStateModel.createManyForUsers (transaction)", () => {
  it("runs inside the given transaction client", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);

    await expect(
      prismaClient.$transaction(async (tx) => {
        await prismaClient.topicReadState.createManyForUsers({
          topicId: topic.id,
          userIds: [owner.id],
          client: tx,
        });
        throw new Error("roll back");
      }),
    ).rejects.toThrow("roll back");

    const rows = await prismaClient.topicReadState.findMany({
      where: { topicId: topic.id },
    });
    expect(rows).toHaveLength(0);
  });
});

describe("topicReadStateModel.getMostRecentlyReadForUser", () => {
  it("returns the most recently read topic for the user", async () => {
    const owner = await createUser();
    const topicA = await createTopic(owner.id);
    const topicB = await createTopic(owner.id);

    await prismaClient.topicReadState.create({
      data: { userId: owner.id, topicId: topicA.id },
    });
    await new Promise((r) => setTimeout(r, 5));
    await prismaClient.topicReadState.create({
      data: { userId: owner.id, topicId: topicB.id },
    });

    const result = await prismaClient.topicReadState.getMostRecentlyReadForUser(
      {
        userId: owner.id,
      },
    );

    expect(result?.topicId).toBe(topicB.id);
  });

  it("skips topics in circles the user is no longer a member of", async () => {
    const owner = await createUser();
    const other = await createUser();
    const stale = await createTopic(other.id);
    const current = await createTopic(owner.id);

    await prismaClient.topicReadState.create({
      data: { userId: owner.id, topicId: current.id },
    });
    await new Promise((r) => setTimeout(r, 5));
    await prismaClient.topicReadState.create({
      data: { userId: owner.id, topicId: stale.id },
    });

    const result = await prismaClient.topicReadState.getMostRecentlyReadForUser(
      {
        userId: owner.id,
      },
    );

    expect(result?.topicId).toBe(current.id);
  });

  it("returns undefined when userId is missing", async () => {
    await expect(
      prismaClient.topicReadState.getMostRecentlyReadForUser({
        userId: undefined,
      }),
    ).resolves.toBeUndefined();
  });
});

describe("topicReadStateModel.getUnreadTopicIds", () => {
  it("flags a topic as unread when its most recent message postdates the user's lastReadAt", async () => {
    const owner = await createUser();
    const other = await createUser();
    const topic = await createTopic(owner.id);

    await prismaClient.topicReadState.create({
      data: { userId: owner.id, topicId: topic.id },
    });
    await new Promise((r) => setTimeout(r, 5));
    await prismaClient.message.create({
      data: { userId: other.id, topicId: topic.id, text: "hello" },
    });

    const unread = await prismaClient.topicReadState.getUnreadTopicIds({
      userId: owner.id,
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
    await prismaClient.topicReadState.create({
      data: { userId: owner.id, topicId: topic.id },
    });

    const unread = await prismaClient.topicReadState.getUnreadTopicIds({
      userId: owner.id,
      topicIds: [topic.id],
    });

    expect(unread).toEqual({});
  });

  it("ignores messages the user sent themselves", async () => {
    const owner = await createUser();
    const other = await createUser();
    const topic = await createTopic(owner.id);

    await prismaClient.topicReadState.create({
      data: { userId: owner.id, topicId: topic.id },
    });
    await new Promise((r) => setTimeout(r, 5));
    await prismaClient.message.create({
      data: { userId: owner.id, topicId: topic.id, text: "mine" },
    });

    await expect(
      prismaClient.topicReadState.getUnreadTopicIds({
        userId: owner.id,
        topicIds: [topic.id],
      }),
    ).resolves.toEqual({});

    await prismaClient.message.create({
      data: { userId: other.id, topicId: topic.id, text: "theirs" },
    });

    await expect(
      prismaClient.topicReadState.getUnreadTopicIds({
        userId: owner.id,
        topicIds: [topic.id],
      }),
    ).resolves.toEqual({ [topic.id]: true });
  });

  it("only flags the requested topics, and only for the given user", async () => {
    const owner = await createUser();
    const other = await createUser();
    const topicA = await createTopic(owner.id);
    const topicB = await createTopic(owner.id);

    for (const topic of [topicA, topicB]) {
      await prismaClient.topicReadState.create({
        data: { userId: owner.id, topicId: topic.id },
      });
    }
    await new Promise((r) => setTimeout(r, 5));
    for (const topic of [topicA, topicB]) {
      await prismaClient.message.create({
        data: { userId: other.id, topicId: topic.id, text: "hi" },
      });
    }

    await expect(
      prismaClient.topicReadState.getUnreadTopicIds({
        userId: owner.id,
        topicIds: [topicA.id],
      }),
    ).resolves.toEqual({ [topicA.id]: true });

    await expect(
      prismaClient.topicReadState.getUnreadTopicIds({
        userId: other.id,
        topicIds: [topicA.id, topicB.id],
      }),
    ).resolves.toEqual({});
  });

  it("returns an empty map when userId or topicIds is missing/empty", async () => {
    const owner = await createUser();
    const topic = await createTopic(owner.id);

    await expect(
      prismaClient.topicReadState.getUnreadTopicIds({
        userId: undefined,
        topicIds: [topic.id],
      }),
    ).resolves.toEqual({});

    await expect(
      prismaClient.topicReadState.getUnreadTopicIds({
        userId: owner.id,
        topicIds: [],
      }),
    ).resolves.toEqual({});
  });
});
