import crypto from "crypto";
import { beforeEach, describe, it, expect } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import { getCircleStats, getMemberActivity } from "./badge-stats";

beforeEach(resetDb);

async function createUser(name = "Test User") {
  return prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name,
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

function message(
  userId: string,
  topicId: string,
  extra: Partial<{
    command: string;
    replyToId: string;
    createdAt: Date;
  }> = {},
) {
  return prismaClient.message.create({
    data: { text: "x", userId, topicId, ...extra },
  });
}

describe("getCircleStats", () => {
  it("aggregates commands, replies received and top-message highlights per member", async () => {
    const a = await createUser();
    const b = await createUser();
    const topic = await createTopic(a.id);

    await message(a.id, topic.id, { command: "roll" });
    await message(a.id, topic.id, { command: "roll" });
    await message(b.id, topic.id, { command: "giphy" });

    const popular = await message(a.id, topic.id);
    const other = await message(a.id, topic.id);
    await message(b.id, topic.id, { replyToId: popular.id });
    await message(b.id, topic.id, { replyToId: other.id });
    await message(a.id, topic.id, { replyToId: popular.id }); // self-reply: excluded

    const c = await createUser();
    await prismaClient.highlight.createMany({
      data: [
        { userId: b.id, messageId: popular.id },
        { userId: c.id, messageId: popular.id },
        { userId: a.id, messageId: popular.id }, // self-highlight: excluded
        { userId: b.id, messageId: other.id },
      ],
    });

    const stats = await getCircleStats(topic.circleId);

    expect(stats.commandCounts).toEqual({
      [a.id]: { roll: 2 },
      [b.id]: { giphy: 1 },
    });
    expect(stats.repliesReceived).toEqual({ [a.id]: 2 });
    expect(stats.topMessageHighlights).toEqual({ [a.id]: 2 });
    // a only self-highlighted, which doesn't count as given.
    expect(stats.highlightsGiven).toEqual({ [a.id]: 0, [b.id]: 2, [c.id]: 1 });
  });
});

describe("getMemberActivity", () => {
  it("summarises the member's own activity and biggest fan in the circle", async () => {
    const me = await createUser();
    const fan = await createUser("Simone de Beauvoir");
    const casual = await createUser();
    const topic = await createTopic(me.id);
    const now = Date.now();

    const recent = await message(me.id, topic.id, {
      createdAt: new Date(now - 60 * 60 * 1000),
    });
    await message(me.id, topic.id, {
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      replyToId: recent.id,
    });
    await message(me.id, topic.id, {
      createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
    });

    await prismaClient.highlight.createMany({
      data: [
        { userId: fan.id, messageId: recent.id },
        { userId: casual.id, messageId: recent.id },
      ],
    });
    const older = await message(me.id, topic.id, {
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
    });
    await prismaClient.highlight.create({
      data: { userId: fan.id, messageId: older.id },
    });

    // Self-highlights: one recent, one outside the 30-day window.
    await prismaClient.highlight.create({
      data: { userId: me.id, messageId: recent.id },
    });
    await prismaClient.highlight.create({
      data: {
        userId: me.id,
        messageId: older.id,
        createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      },
    });

    const activity = await getMemberActivity({
      circleId: topic.circleId,
      userId: me.id,
      highlightsReceived: 3,
    });

    // Three of the four messages fall inside the 60-day window (the 60-day-old one may straddle it).
    expect(activity.recentActiveDays.length).toBeGreaterThanOrEqual(3);
    expect(activity.recentActiveDays).toEqual(
      [...activity.recentActiveDays].sort().reverse(),
    );
    expect(activity).toMatchObject({
      messages: 4,
      repliesSent: 1,
      activeDaysLast30: 3,
      activeDaysTotal: 4,
      highlightsReceived: 3,
      recentSelfHighlights: 1,
      topicsCreated: 1,
      biggestFan: { name: "Simone de Beauvoir", highlights: 2 },
    });
  });
});
