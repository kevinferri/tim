import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    topic: { isUserInTopic: vi.fn() },
    message: { getThreadMessages: vi.fn() },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest() {
  return new NextRequest(
    "http://localhost/api/topics/topic-1/threads/root-1",
  );
}

describe("GET /api/topics/[topicId]/threads/[threadRootId]", () => {
  it("returns 401 when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ topicId: "topic-1", threadRootId: "root-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 404 when the user isn't a member of the topic", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.isUserInTopic).mockResolvedValue(false);

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ topicId: "topic-1", threadRootId: "root-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 404 when the thread root isn't in the result set", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.isUserInTopic).mockResolvedValue(true);
    vi.mocked(prismaClient.message.getThreadMessages).mockResolvedValue([]);

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ topicId: "topic-1", threadRootId: "root-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns the thread messages for a member", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.isUserInTopic).mockResolvedValue(true);
    vi.mocked(prismaClient.message.getThreadMessages).mockResolvedValue([
      { id: "root-1" },
      { id: "reply-1", threadRootId: "root-1" },
    ] as any);

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ topicId: "topic-1", threadRootId: "root-1" }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([
      { id: "root-1" },
      { id: "reply-1", threadRootId: "root-1" },
    ]);
    expect(prismaClient.message.getThreadMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: "topic-1",
        threadRootId: "root-1",
      }),
    );
  });
});
