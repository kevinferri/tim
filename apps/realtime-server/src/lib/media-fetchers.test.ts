import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { getRandomGif, getYoutubeVideo } from "./media-fetchers";

// NODE_ENV is "test" under vitest, which the fallback deliberately excludes
// (see is-local-dev.ts) -- stub it to a real local-dev value to exercise
// the fallback branch here instead of the live-fetch branch.
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getRandomGif", () => {
  it("returns a canned gif URL and skips the network call when GIPHY_KEY is unset", async () => {
    vi.stubEnv("GIPHY_KEY", "");

    const result = await getRandomGif("cat");

    expect(result).toMatch(/^https:\/\/media\.giphy\.com\//);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls the real Giphy API when GIPHY_KEY is set", async () => {
    vi.stubEnv("GIPHY_KEY", "real-key");
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { images: { original: { url: "live-url" } } },
      }),
    } as Response);

    const result = await getRandomGif("cat");

    expect(result).toBe("live-url");
    expect(fetch).toHaveBeenCalled();
  });
});

describe("getYoutubeVideo", () => {
  it("returns a canned video URL and skips the network call when YOUTUBE_KEY is unset", async () => {
    vi.stubEnv("YOUTUBE_KEY", "");

    const result = await getYoutubeVideo("lofi");

    expect(result).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls the real YouTube API when YOUTUBE_KEY is set", async () => {
    vi.stubEnv("YOUTUBE_KEY", "real-key");
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: { videoId: "abc123" } }] }),
    } as Response);

    const result = await getYoutubeVideo("lofi");

    expect(result).toBe("https://www.youtube.com/watch?v=abc123");
    expect(fetch).toHaveBeenCalled();
  });
});
