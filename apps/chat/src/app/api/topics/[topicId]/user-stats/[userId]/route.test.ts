import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    topic: { getNameWithMemberIds: vi.fn() },
    message: {
      getTopHighlightedMessagesForTopic: vi.fn(),
    },
    notification: {
      countMentionsReceivedByUser: vi.fn(),
      countMentionsSentByUser: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma/badge-stats", () => ({
  getCircleStats: vi.fn(),
  getMemberActivity: vi.fn(),
}));

import { getLoggedInUserId } from "@/lib/session";
import { getCircleStats, getMemberActivity } from "@/lib/prisma/badge-stats";
import { prismaClient } from "@/lib/prisma/client";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest() {
  return new NextRequest(
    "http://localhost/api/topics/topic-1/user-stats/user-2",
  );
}

function makeParams() {
  return { params: Promise.resolve({ topicId: "topic-1", userId: "user-2" }) };
}

describe("GET /api/topics/[topicId]/user-stats/[userId]", () => {
  it("returns 401 when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(401);
  });

  it("returns 400 when the topic doesn't exist", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockResolvedValue(
      null as any,
    );

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(400);
  });

  it("returns 404 when the target user isn't a member of the topic", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockResolvedValue({
      name: "General",
      memberIds: ["user-1"],
    } as any);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
  });

  const memberActivity = {
    messages: 20,
    repliesGiven: 4,
    recentSelfHighlights: 0,
    lastMessageAt: new Date(),
    activeDaysTotal: 2,
    recentActiveDays: [],
    topicsCreated: 0,
  };

  function mockTopic() {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockResolvedValue({
      name: "General",
      circleId: "circle-1",
      circleName: "Sandbox",
      circleCreatorId: "user-1",
      memberIds: ["user-1", "user-2"],
    } as any);
  }

  it("returns stats scoped to the circle, scoring the member within it", async () => {
    mockTopic();
    vi.mocked(
      prismaClient.message.getTopHighlightedMessagesForTopic,
    ).mockResolvedValue([{ id: "message-1" }] as any);
    vi.mocked(getCircleStats).mockResolvedValue({
      members: [
        { userId: "user-1", messages: 20, highlights: 2, given: 18 },
        { userId: "user-2", messages: 20, highlights: 18, given: 1 },
      ],
      commandCounts: {},
      // Under the 5-reply minimum for Conversation Starter.
      repliesReceived: { "user-2": 4 },
      topMessageHighlights: {},
      highlightsGiven: { "user-1": 18, "user-2": 1 },
    });
    vi.mocked(getMemberActivity).mockResolvedValue(memberActivity);
    vi.mocked(
      prismaClient.notification.countMentionsReceivedByUser,
    ).mockResolvedValue(7);
    vi.mocked(
      prismaClient.notification.countMentionsSentByUser,
    ).mockResolvedValue(3);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const statBadgeCount = (await res.clone().json()).badges.filter(
      (b: { key: string }) => b.key.startsWith("stat-"),
    ).length;
    expect(statBadgeCount).toBe(4);
    expect(res.headers.get("Server-Timing")).toMatch(
      /topic;dur=[\d.]+.*circle;dur=[\d.]+/,
    );
    expect(
      prismaClient.notification.countMentionsReceivedByUser,
    ).toHaveBeenCalledWith({ userId: "user-2", circleId: "circle-1" });
    await expect(res.json()).resolves.toEqual({
      topicName: "General",
      circleName: "Sandbox",
      highlightScore: {
        multiplier: 1.4,
        topPercent: 50,
        bottomPercent: 100,
        place: 1,
      },
      badges: expect.arrayContaining([
        {
          key: "score",
          // First of two: first place never ranks below Grandmaster.
          emoji: "🔱",
          label: "Grandmaster",
          tooltip: "Highlight score 140 · Top 50% in Sandbox",
          rarity: "epic",
        },
        {
          key: "giving",
          emoji: "🐉",
          label: "Greedy",
          tooltip: "Gave 1, got 18 highlights in Sandbox",
          rarity: "common",
        },
      ]),
      messagesSent: 20,
      highlightsGiven: 1,
      highlightsReceived: 18,
      topHighlights: [{ id: "message-1" }],
      repliesReceived: 4,
      repliesGiven: 4,
      activeDays: 2,
      mentionsReceived: 7,
      mentionsSent: 3,
    });
  });

  it("returns a null highlightScore and zero counts when the user hasn't posted in the circle", async () => {
    mockTopic();
    vi.mocked(
      prismaClient.message.getTopHighlightedMessagesForTopic,
    ).mockResolvedValue([] as any);
    vi.mocked(getCircleStats).mockResolvedValue({
      members: [{ userId: "user-1", messages: 5, highlights: 3, given: 0 }],
      commandCounts: {},
      repliesReceived: {},
      topMessageHighlights: {},
      highlightsGiven: {},
    });
    vi.mocked(getMemberActivity).mockResolvedValue({
      ...memberActivity,
      messages: 0,
      repliesGiven: 0,
      activeDaysTotal: 0,
    });
    vi.mocked(
      prismaClient.notification.countMentionsReceivedByUser,
    ).mockResolvedValue(0);
    vi.mocked(
      prismaClient.notification.countMentionsSentByUser,
    ).mockResolvedValue(0);

    const res = await GET(makeRequest(), makeParams());

    const body = await res.json();
    expect(body.highlightScore).toBeNull();
    expect(body).toMatchObject({
      messagesSent: 0,
      highlightsGiven: 0,
      highlightsReceived: 0,
      repliesReceived: 0,
    });
  });

  it("returns 400 when the model layer throws", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockRejectedValue(
      new Error("db down"),
    );

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(400);
  });
});
