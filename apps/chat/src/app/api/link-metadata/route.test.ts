import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));
vi.mock("fetch-opengraph", () => ({
  default: { fetch: vi.fn() },
}));

import { getLoggedInUserId } from "@/lib/session";
import og from "fetch-opengraph";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(url: string) {
  return new NextRequest(
    `http://localhost/api/link-metadata?url=${encodeURIComponent(url)}`
  );
}

describe("GET /api/link-metadata", () => {
  it("returns 400 when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);

    const res = await GET(makeRequest("example.com"));

    expect(res.status).toBe(400);
    expect(og.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid url", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");

    const res = await GET(makeRequest("not a url"));

    expect(res.status).toBe(400);
    expect(og.fetch).not.toHaveBeenCalled();
  });

  it("hydrates a bare host with https:// before fetching", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(og.fetch).mockResolvedValue({
      "og:site_name": "Example",
      "og:title": "Title",
      "og:description": "Description",
    } as any);

    const res = await GET(makeRequest("example.com"));

    expect(og.fetch).toHaveBeenCalledWith("https://example.com");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ogSiteName: "Example",
      ogTitle: "Title",
      ogDescription: "Description",
      ogImage: undefined,
      ogVideo: undefined,
    });
  });

  it("drops an image/video url from the metadata if it isn't a valid url", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(og.fetch).mockResolvedValue({
      "og:site_name": "Example",
      image: "not-a-url",
      video: "https://example.com/video.mp4",
    } as any);

    const res = await GET(makeRequest("https://example.com"));

    const body = await res.json();
    expect(body.ogImage).toBeUndefined();
    expect(body.ogVideo).toBe("https://example.com/video.mp4");
  });

  it("returns 400 when the metadata fetch throws", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(og.fetch).mockRejectedValue(new Error("network error"));

    const res = await GET(makeRequest("https://example.com"));

    expect(res.status).toBe(400);
  });

  it("returns 400 when the metadata fetch resolves falsy", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
    vi.mocked(og.fetch).mockResolvedValue(undefined as any);

    const res = await GET(makeRequest("https://example.com"));

    expect(res.status).toBe(400);
  });
});
