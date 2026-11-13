import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    circle: { isUserInCircle: vi.fn() },
  },
}));

vi.mock("./model", async () => {
  const { ApiError } =
    await vi.importActual<typeof import("@/lib/api-error")>("@/lib/api-error");
  return {
    getGamesBadge: vi.fn(),
    getSamePageState: vi.fn(),
    getSockStatus: vi.fn(),
    getStandings: vi.fn(),
    markResultsViewed: vi.fn(),
    submitSamePageAnswer: vi.fn(),
    isCircleAdmin: vi.fn(),
    setSamePageEnabled: vi.fn(),
    SamePageValidationError: class SamePageValidationError extends ApiError {
      constructor(message: string) {
        super(400, message);
        this.name = "SamePageValidationError";
      }
    },
  };
});

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import {
  getSamePageState,
  isCircleAdmin,
  SamePageValidationError,
  setSamePageEnabled,
  submitSamePageAnswer,
} from "./model";
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
    vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(false);

    const res = await GET(new Request("http://localhost/api"), ctx);

    expect(res.status).toBe(403);
    expect(prismaClient.circle.isUserInCircle).toHaveBeenCalledWith({
      circleId,
      userId: "user-1",
    });
  });

  it("returns state for a circle member", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(true);
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
    vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(false);

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
    vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(true);
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

  it("rejects a non-string calledUserId before it reaches the model", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(true);

    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({
          action: "answer",
          text: "Pizza",
          calledUserId: 42,
        }),
      }),
      ctx,
    );

    expect(res.status).toBe(400);
    expect(submitSamePageAnswer).not.toHaveBeenCalled();
  });

  it("maps validation errors to 400", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(true);
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
    vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(true);
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

  it.each(["enable", "disable"])(
    "rejects %s from members who aren't the circle admin",
    async (action) => {
      vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
      vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(true);
      vi.mocked(isCircleAdmin).mockResolvedValue(false);

      const res = await POST(
        new Request("http://localhost/api", {
          method: "POST",
          body: JSON.stringify({ action }),
        }),
        ctx,
      );

      expect(res.status).toBe(403);
      expect(setSamePageEnabled).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["enable", true],
    ["disable", false],
  ] as const)("lets the admin %s Same Page", async (action, enabled) => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(true);
    vi.mocked(isCircleAdmin).mockResolvedValue(true);

    const res = await POST(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(isCircleAdmin).toHaveBeenCalledWith(circleId, "user-1");
    expect(setSamePageEnabled).toHaveBeenCalledWith(circleId, enabled);
  });
});
