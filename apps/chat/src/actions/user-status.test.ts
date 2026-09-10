import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    user: {
      updateStatus: vi.fn(),
    },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { updateUserStatus } from "./user-status";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateUserStatus", () => {
  it("delegates to the model with the logged-in user id and given status", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.user.updateStatus).mockResolvedValue({ status: "away" } as any);

    const result = await updateUserStatus("away");

    expect(prismaClient.user.updateStatus).toHaveBeenCalledWith({
      userId: "user-1",
      status: "away",
    });
    expect(result).toEqual({ status: "away" });
  });

  it("passes a null status through unchanged", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.user.updateStatus).mockResolvedValue({ status: null } as any);

    await updateUserStatus(null);

    expect(prismaClient.user.updateStatus).toHaveBeenCalledWith({
      userId: "user-1",
      status: null,
    });
  });
});
