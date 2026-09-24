import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    notification: { getUnreadCount: vi.fn() },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/notifications/unread-count", () => {
  it("returns 401 when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns the unread count for the logged-in user", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.notification.getUnreadCount).mockResolvedValue(5);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ count: 5 });
    expect(prismaClient.notification.getUnreadCount).toHaveBeenCalledWith({
      userId: "user-1",
    });
  });

  it("returns 400 when the model layer throws", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.notification.getUnreadCount).mockRejectedValue(
      new Error("db down"),
    );

    const res = await GET();

    expect(res.status).toBe(400);
  });
});
