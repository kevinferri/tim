import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    message: { getById: vi.fn() },
    topic: { isUserInTopic: vi.fn() },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest() {
  return new NextRequest("http://localhost/api/message/message-1");
}

describe("GET /api/message/[messageId]", () => {
  it("returns 401 when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);

    const res = await GET(makeRequest(), { params: Promise.resolve({ messageId: "message-1" }) });

    expect(res.status).toBe(401);
  });

  it("returns 400 when messageId is missing", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");

    const res = await GET(makeRequest(), { params: Promise.resolve({ messageId: "" }) });

    expect(res.status).toBe(400);
  });

  it("returns 404 when the message doesn't exist", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.message.getById).mockResolvedValue(null as any);

    const res = await GET(makeRequest(), { params: Promise.resolve({ messageId: "message-1" }) });

    expect(res.status).toBe(404);
  });

  it("returns 404 when the user isn't in the message's topic", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.message.getById).mockResolvedValue({
      id: "message-1",
      text: "encrypted",
      topic: { id: "topic-1" },
    } as any);
    vi.mocked(prismaClient.topic.isUserInTopic).mockResolvedValue(false);

    const res = await GET(makeRequest(), { params: Promise.resolve({ messageId: "message-1" }) });

    expect(res.status).toBe(404);
  });

  it("returns the normalized message for a member", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.message.getById).mockResolvedValue({
      id: "message-1",
      text: undefined,
      topic: { id: "topic-1" },
    } as any);
    vi.mocked(prismaClient.topic.isUserInTopic).mockResolvedValue(true);

    const res = await GET(makeRequest(), { params: Promise.resolve({ messageId: "message-1" }) });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ id: "message-1" });
    expect(prismaClient.topic.isUserInTopic).toHaveBeenCalledWith({
      userId: "user-1",
      topicId: "topic-1",
    });
  });

  it("returns 400 when the model layer throws", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.message.getById).mockRejectedValue(new Error("db down"));

    const res = await GET(makeRequest(), { params: Promise.resolve({ messageId: "message-1" }) });

    expect(res.status).toBe(400);
  });
});
