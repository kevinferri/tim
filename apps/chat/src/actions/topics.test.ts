import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    topic: {
      upsertForUser: vi.fn(),
      deleteByIdForUser: vi.fn(),
    },
  },
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { upsertTopic, deleteTopic } from "./topics";

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

describe("upsertTopic", () => {
  it("rejects a payload missing a required field", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");

    const result = await upsertTopic(
      formData({
        name: "",
        circleId: "circle-1",
        description: null,
        topicId: null,
      }),
    );

    expect(result).toBe(false);
    expect(prismaClient.topic.upsertForUser).not.toHaveBeenCalled();
  });

  it("delegates to the model with the logged-in user id on a valid payload", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.upsertForUser).mockResolvedValue({
      data: { id: "topic-1" },
    } as any);

    const result = await upsertTopic(
      formData({
        name: "General",
        circleId: "circle-1",
        description: null,
        topicId: null,
      }),
    );

    expect(prismaClient.topic.upsertForUser).toHaveBeenCalledWith({
      userId: "user-1",
      circleId: "circle-1",
      topicId: null,
      name: "General",
      description: null,
    });
    expect(result).toEqual({ data: { id: "topic-1" } });
  });
});

describe("deleteTopic", () => {
  it("delegates to the model with the logged-in user id", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(prismaClient.topic.deleteByIdForUser).mockResolvedValue(
      true as any,
    );

    const result = await deleteTopic({
      topicId: "topic-1",
      circleId: "circle-1",
    });

    expect(prismaClient.topic.deleteByIdForUser).toHaveBeenCalledWith({
      userId: "user-1",
      topicId: "topic-1",
      circleId: "circle-1",
    });
    expect(result).toBe(true);
  });
});
