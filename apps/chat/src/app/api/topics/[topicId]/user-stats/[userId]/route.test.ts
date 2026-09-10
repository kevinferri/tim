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
    },
    highlight: {
      countGivenByUser: vi.fn(),
      countReceivedByUser: vi.fn(),
    },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest() {
  return new NextRequest("http://localhost/api/topics/topic-1/user-stats/user-2");
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
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockResolvedValue(null as any);

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

  it("returns aggregated stats for a member, computing highlightScore from the results", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockResolvedValue({
      name: "General",
      memberIds: ["user-1", "user-2"],
    } as any);
    vi.mocked(prismaClient.message.getTopHighlightedMessagesForTopic).mockResolvedValue([
      { id: "message-1" },
    ] as any);
    vi.mocked(prismaClient.message.count).mockResolvedValue(4 as any);
    vi.mocked(prismaClient.highlight.countGivenByUser).mockResolvedValue(1 as any);
    vi.mocked(prismaClient.highlight.countReceivedByUser).mockResolvedValue(2 as any);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      topicName: "General",
      highlightScore: 50,
      messagesSent: 4,
      highlightsGiven: 1,
      highlightsRecieved: 2,
      topHighlights: [{ id: "message-1" }],
    });
  });

  it("returns a highlightScore of 0 instead of NaN when no messages were sent", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockResolvedValue({
      name: "General",
      memberIds: ["user-1", "user-2"],
    } as any);
    vi.mocked(prismaClient.message.getTopHighlightedMessagesForTopic).mockResolvedValue([] as any);
    vi.mocked(prismaClient.message.count).mockResolvedValue(0 as any);
    vi.mocked(prismaClient.highlight.countGivenByUser).mockResolvedValue(0 as any);
    vi.mocked(prismaClient.highlight.countReceivedByUser).mockResolvedValue(0 as any);

    const res = await GET(makeRequest(), makeParams());

    const body = await res.json();
    expect(body.highlightScore).toBe(0);
  });

  it("returns 400 when the model layer throws", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.getNameWithMemberIds).mockRejectedValue(new Error("db down"));

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(400);
  });
});
