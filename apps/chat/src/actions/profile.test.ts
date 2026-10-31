import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/cloudinary", () => ({
  uploadImage: vi.fn(),
}));
vi.mock("@/lib/prisma/client", () => ({
  prismaClient: { user: { updateProfile: vi.fn() } },
}));

import { getLoggedInUserId } from "@/lib/session";
import { uploadImage } from "@/lib/cloudinary";
import { prismaClient } from "@/lib/prisma/client";
import { updateProfile } from "./profile";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
  vi.mocked(prismaClient.user.updateProfile).mockResolvedValue({
    data: { id: "user-1", displayName: "Kev", imageUrl: null },
  } as any);
});

describe("updateProfile", () => {
  it("returns false when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);

    await expect(updateProfile({ displayName: "Kev" })).resolves.toBe(false);
    expect(prismaClient.user.updateProfile).not.toHaveBeenCalled();
  });

  it("trims the display name and leaves the avatar alone when none is given", async () => {
    await updateProfile({ displayName: "  Kev  " });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(prismaClient.user.updateProfile).toHaveBeenCalledWith({
      userId: "user-1",
      displayName: "Kev",
      imageUrl: undefined,
    });
  });

  it.each([
    ["blank", "   "],
    ["too long", "x".repeat(33)],
  ])("rejects a %s display name", async (_, displayName) => {
    await expect(updateProfile({ displayName })).resolves.toBe(false);
    expect(prismaClient.user.updateProfile).not.toHaveBeenCalled();
  });

  it("uploads the avatar and saves its URL", async () => {
    vi.mocked(uploadImage).mockResolvedValue({
      secure_url: "https://cdn.example.com/avatar.jpg",
    } as any);

    await updateProfile({
      displayName: "Kev",
      avatar: "data:image/jpeg;base64,xyz",
    });

    expect(uploadImage).toHaveBeenCalledWith("data:image/jpeg;base64,xyz");
    expect(prismaClient.user.updateProfile).toHaveBeenCalledWith({
      userId: "user-1",
      displayName: "Kev",
      imageUrl: "https://cdn.example.com/avatar.jpg",
    });
  });

  it("rejects an avatar that isn't an image data URL", async () => {
    await expect(
      updateProfile({
        displayName: "Kev",
        avatar: "https://evil.example.com/a.png",
      }),
    ).resolves.toBe(false);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("doesn't save anything when the upload fails", async () => {
    vi.mocked(uploadImage).mockResolvedValue(undefined);

    await expect(
      updateProfile({ displayName: "Kev", avatar: "data:image/jpeg;base64,x" }),
    ).resolves.toBe(false);
    expect(prismaClient.user.updateProfile).not.toHaveBeenCalled();
  });
});
