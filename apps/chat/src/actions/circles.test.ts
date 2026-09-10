import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    circle: {
      upsertForUser: vi.fn(),
      deleteByIdForUser: vi.fn(),
    },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { upsertCircle, deleteCircle } from "./circles";

beforeEach(() => {
  vi.clearAllMocks();
});

function formData(fields: Record<string, string | null>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) data.set(key, value);
  }
  return data;
}

describe("upsertCircle", () => {
  it("rejects a payload missing a required field", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");

    const result = await upsertCircle(
      formData({
        name: "",
        circleId: null,
        description: null,
        imageUrl: null,
        members: null,
        defaultTopicName: null,
      })
    );

    expect(result).toBe(false);
    expect(prismaClient.circle.upsertForUser).not.toHaveBeenCalled();
  });

  it("delegates to the model with the logged-in user id on a valid payload", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.upsertForUser).mockResolvedValue({
      data: { id: "circle-1" },
    } as any);

    const result = await upsertCircle(
      formData({
        name: "My Circle",
        circleId: null,
        description: null,
        imageUrl: null,
        members: "a@example.com, b@example.com",
        defaultTopicName: null,
      })
    );

    expect(prismaClient.circle.upsertForUser).toHaveBeenCalledWith({
      userId: "user-1",
      circleId: null,
      name: "My Circle",
      description: null,
      imageUrl: null,
      memberEmails: "a@example.com, b@example.com",
      defaultTopicName: null,
    });
    expect(result).toEqual({ data: { id: "circle-1" } });
  });
});

describe("deleteCircle", () => {
  it("delegates to the model with the logged-in user id", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.circle.deleteByIdForUser).mockResolvedValue(true as any);

    const result = await deleteCircle({ circleId: "circle-1" });

    expect(prismaClient.circle.deleteByIdForUser).toHaveBeenCalledWith({
      userId: "user-1",
      circleId: "circle-1",
    });
    expect(result).toBe(true);
  });
});
