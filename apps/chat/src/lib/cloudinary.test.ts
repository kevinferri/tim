import { afterEach, describe, it, expect, vi } from "vitest";
import { uploadImage } from "./cloudinary";

// NODE_ENV is "test" under vitest, which the fallback deliberately excludes --
// stub it to a real local-dev value to exercise the fallback branch here.
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("uploadImage", () => {
  it("returns the Cloudinary demo asset and skips the real upload when CLOUDINARY_URL is unset outside production/test", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLOUDINARY_URL", "");

    const result = await uploadImage("data:image/png;base64,xyz");

    expect(result).toEqual({
      secure_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    });
  });
});
