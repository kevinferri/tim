import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    notification: {
      markAllReadForUser: vi.fn(),
    },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { markAllNotificationsRead } from "./notifications";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markAllNotificationsRead", () => {
  it("delegates to the model with the logged-in user id", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.notification.markAllReadForUser).mockResolvedValue({
      count: 3,
    } as any);

    const result = await markAllNotificationsRead();

    expect(prismaClient.notification.markAllReadForUser).toHaveBeenCalledWith({
      userId: "user-1",
    });
    expect(result).toEqual({ count: 3 });
  });
});
