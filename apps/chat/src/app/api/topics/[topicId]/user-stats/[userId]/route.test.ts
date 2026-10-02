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
      count: vi.fn(),
      countRepliesReceivedByUser: vi.fn(),
      countRepliesGivenByUser: vi.fn(),
      countActiveDaysByUser: vi.fn(),
    },
    notification: {
      countMentionsReceivedByUser: vi.fn(),
      countMentionsSentByUser: vi.fn(),
    },
    highlight: {
      countGivenByUser: vi.fn(),
      countReceivedByUser: vi.fn(),
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

  it("returns aggregated stats for a member, scoring them within the circle", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockResolvedValue({
      name: "General",
      circleId: "circle-1",
      circleName: "Sandbox",
      memberIds: ["user-1", "user-2"],
    } as any);
    vi.mocked(
      prismaClient.message.getTopHighlightedMessagesForTopic,
    ).mockResolvedValue([{ id: "message-1" }] as any);
    vi.mocked(prismaClient.message.count).mockResolvedValue(4 as any);
    vi.mocked(prismaClient.highlight.countGivenByUser).mockResolvedValue(
      1 as any,
    );
    vi.mocked(prismaClient.highlight.countReceivedByUser).mockResolvedValue(
      2 as any,
    );
    vi.mocked(
      prismaClient.message.countRepliesReceivedByUser,
    ).mockResolvedValue(5);
    vi.mocked(prismaClient.message.countRepliesGivenByUser).mockResolvedValue(
      4,
    );
    vi.mocked(prismaClient.message.countActiveDaysByUser).mockResolvedValue(2);
    vi.mocked(
      prismaClient.notification.countMentionsReceivedByUser,
    ).mockResolvedValue(7);
    vi.mocked(
      prismaClient.notification.countMentionsSentByUser,
    ).mockResolvedValue(3);
    vi.mocked(getCircleStats).mockResolvedValue({
      members: [
        { userId: "user-1", messages: 20, highlights: 2, given: 0 },
        { userId: "user-2", messages: 20, highlights: 18, given: 0 },
      ],
      commandCounts: {},
      repliesReceived: {},
      topMessageHighlights: {},
    });
    vi.mocked(getMemberActivity).mockResolvedValue({
      messages: 20,
      highlightsReceived: 18,
      repliesSent: 0,
      recentSelfHighlights: 0,
      lastMessageAt: new Date(),
      activeDaysLast30: 2,
      activeDaysTotal: 2,
      joinedAt: new Date("2026-01-01T00:00:00Z"),
      biggestFan: null,
    });

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      topicName: "General",
      circleName: "Sandbox",
      highlightScore: { multiplier: 1.4, topPercent: 50, bottomPercent: 100 },
      badges: [
        {
          key: "score",
          emoji: "✨",
          label: "Quotable",
          tooltip: "Highlight score 140 · Top 50% in Sandbox",
          rarity: "common",
        },
        {
          key: "giving",
          emoji: "🐉",
          label: "Greedy",
          tooltip: "Gave 0, got 18 highlights in Sandbox",
          rarity: "common",
        },
      ],
      messagesSent: 4,
      highlightsGiven: 1,
      highlightsReceived: 2,
      topHighlights: [{ id: "message-1" }],
      repliesReceived: 5,
      repliesGiven: 4,
      activeDays: 2,
      mentionsReceived: 7,
      mentionsSent: 3,
    });
  });

  it("returns a null highlightScore when the user hasn't posted in the circle", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockResolvedValue({
      name: "General",
      circleId: "circle-1",
      circleName: "Sandbox",
      memberIds: ["user-1", "user-2"],
    } as any);
    vi.mocked(
      prismaClient.message.getTopHighlightedMessagesForTopic,
    ).mockResolvedValue([] as any);
    vi.mocked(prismaClient.message.count).mockResolvedValue(0 as any);
    vi.mocked(prismaClient.highlight.countGivenByUser).mockResolvedValue(
      0 as any,
    );
    vi.mocked(prismaClient.highlight.countReceivedByUser).mockResolvedValue(
      0 as any,
    );
    vi.mocked(
      prismaClient.message.countRepliesReceivedByUser,
    ).mockResolvedValue(0);
    vi.mocked(prismaClient.message.countRepliesGivenByUser).mockResolvedValue(
      0,
    );
    vi.mocked(prismaClient.message.countActiveDaysByUser).mockResolvedValue(0);
    vi.mocked(
      prismaClient.notification.countMentionsReceivedByUser,
    ).mockResolvedValue(0);
    vi.mocked(
      prismaClient.notification.countMentionsSentByUser,
    ).mockResolvedValue(0);
    vi.mocked(getCircleStats).mockResolvedValue({
      members: [{ userId: "user-1", messages: 5, highlights: 3, given: 0 }],
      commandCounts: {},
      repliesReceived: {},
      topMessageHighlights: {},
    });
    vi.mocked(getMemberActivity).mockResolvedValue({
      messages: 20,
      highlightsReceived: 18,
      repliesSent: 0,
      recentSelfHighlights: 0,
      lastMessageAt: new Date(),
      activeDaysLast30: 2,
      activeDaysTotal: 2,
      joinedAt: new Date("2026-01-01T00:00:00Z"),
      biggestFan: null,
    });

    const res = await GET(makeRequest(), makeParams());

    const body = await res.json();
    expect(body.highlightScore).toBeNull();
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
