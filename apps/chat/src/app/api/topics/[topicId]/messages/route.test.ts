import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    topic: { isUserInTopic: vi.fn() },
    message: { getMessagesForTopic: vi.fn() },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(search = "") {
  return new NextRequest(`http://localhost/api/topics/topic-1/messages${search}`);
}

describe("GET /api/topics/[topicId]/messages", () => {
  it("returns 401 when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);

    const res = await GET(makeRequest(), { params: Promise.resolve({ topicId: "topic-1" }) });

    expect(res.status).toBe(401);
  });

  it("returns 404 when the user isn't a member of the topic", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.isUserInTopic).mockResolvedValue(false);

    const res = await GET(makeRequest(), { params: Promise.resolve({ topicId: "topic-1" }) });

    expect(res.status).toBe(404);
  });

  it("returns messages for a member and forwards the 'before' cursor", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.isUserInTopic).mockResolvedValue(true);
    vi.mocked(prismaClient.message.getMessagesForTopic).mockResolvedValue([
      { id: "message-1" },
    ] as any);

    const res = await GET(makeRequest("?before=message-0"), {
      params: Promise.resolve({ topicId: "topic-1" }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ id: "message-1" }]);
    expect(prismaClient.message.getMessagesForTopic).toHaveBeenCalledWith(
      expect.objectContaining({
        requestingUserId: "user-1",
        topicId: "topic-1",
        before: "message-0",
      })
    );
  });

  it("returns 400 when the model layer throws", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.isUserInTopic).mockRejectedValue(new Error("db down"));

    const res = await GET(makeRequest(), { params: Promise.resolve({ topicId: "topic-1" }) });

    expect(res.status).toBe(400);
  });
});
