import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("@/lib/cloudinary", () => ({
  uploadImage: vi.fn(),
}));

import { getLoggedInUserId } from "@/lib/session";
import { uploadImage } from "@/lib/cloudinary";
import { uploadMedia } from "./media";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uploadMedia", () => {
  it("returns false when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);

    const result = await uploadMedia({ file: "data:image/png;base64,xyz" });

    expect(result).toBe(false);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("uploads the file and returns its secure URL when logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(uploadImage).mockResolvedValue({
      secure_url: "https://cdn.example.com/image.png",
    } as any);

    const result = await uploadMedia({ file: "data:image/png;base64,xyz" });

    expect(uploadImage).toHaveBeenCalledWith("data:image/png;base64,xyz");
    expect(result).toEqual({ mediaUrl: "https://cdn.example.com/image.png" });
  });

  it("returns an undefined mediaUrl when the upload fails", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(uploadImage).mockResolvedValue(undefined);

    const result = await uploadMedia({ file: "data:image/png;base64,xyz" });

    expect(result).toEqual({ mediaUrl: undefined });
  });
});
