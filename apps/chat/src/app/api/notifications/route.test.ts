import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    notification: { getForUser: vi.fn() },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(search = "") {
  return new NextRequest(`http://localhost/api/notifications${search}`);
}

describe("GET /api/notifications", () => {
  it("returns 401 when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it("returns notifications for the logged-in user and forwards the 'before' cursor", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.notification.getForUser).mockResolvedValue([
      { id: "notif-1" },
    ] as any);

    const res = await GET(makeRequest("?before=notif-0"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ id: "notif-1" }]);
    expect(prismaClient.notification.getForUser).toHaveBeenCalledWith({
      userId: "user-1",
      before: "notif-0",
    });
  });

  it("returns 400 when the model layer throws", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.notification.getForUser).mockRejectedValue(
      new Error("db down"),
    );

    const res = await GET(makeRequest());

    expect(res.status).toBe(400);
  });
});
