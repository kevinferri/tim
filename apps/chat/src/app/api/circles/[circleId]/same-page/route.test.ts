import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    circle: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/same-page/same-page-model", () => ({
  getGamesBadge: vi.fn(),
  getSamePageState: vi.fn(),
  getSockStatus: vi.fn(),
  getStandings: vi.fn(),
  markResultsViewed: vi.fn(),
  submitSamePageAnswer: vi.fn(),
  SamePageValidationError: class SamePageValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "SamePageValidationError";
    }
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import {
  getSamePageState,
  SamePageValidationError,
  submitSamePageAnswer,
} from "@/lib/same-page/same-page-model";
import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

const circleId = "circle-1";
const ctx = { params: Promise.resolve({ circleId }) };

describe("GET /api/circles/[circleId]/same-page", () => {
  it("returns 401 when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);
    const res = await GET(new Request("http://localhost/api"), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 403 when the user is not a circle member", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.findFirst).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api"), ctx);

    expect(res.status).toBe(403);
    expect(prismaClient.circle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: circleId, members: { some: { id: "user-1" } } },
      }),
    );
  });

  it("returns state for a circle member", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.findFirst).mockResolvedValue({
      id: circleId,
    } as any);
    vi.mocked(getSamePageState).mockResolvedValue({
      phase: "play",
    } as any);

    const res = await GET(new Request("http://localhost/api"), ctx);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ phase: "play" });
  });
});

describe("POST /api/circles/[circleId]/same-page", () => {
  it("returns 403 for non-members", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.findFirst).mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ action: "answer", text: "hi" }),
      }),
      ctx,
    );

    expect(res.status).toBe(403);
  });

  it("forwards answer action for members", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.findFirst).mockResolvedValue({
      id: circleId,
    } as any);
    vi.mocked(submitSamePageAnswer).mockResolvedValue({
      id: "ans-1",
      text: "Survivor",
    } as any);

    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({
          action: "answer",
          text: "Survivor",
          calledUserId: "user-2",
        }),
      }),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(submitSamePageAnswer).toHaveBeenCalledWith({
      circleId,
      userId: "user-1",
      text: "Survivor",
      calledUserId: "user-2",
    });
  });

  it("maps validation errors to 400", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.findFirst).mockResolvedValue({
      id: circleId,
    } as any);
    vi.mocked(submitSamePageAnswer).mockRejectedValue(
      new SamePageValidationError("Answer is locked and cannot be changed"),
    );

    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ action: "answer", text: "Survivor" }),
      }),
      ctx,
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Answer is locked and cannot be changed",
    });
  });

  it("maps unexpected errors to a generic 500", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.findFirst).mockResolvedValue({
      id: circleId,
    } as any);
    vi.mocked(submitSamePageAnswer).mockRejectedValue(
      new Error("prisma exploded: connection refused"),
    );

    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ action: "answer", text: "Survivor" }),
      }),
      ctx,
    );

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Request failed" });
  });
});
