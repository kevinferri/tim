import { describe, it, expect } from "vitest";
import {
  hydrateUrl,
  isValidUrl,
  isEmojiOnly,
  shortUrlLabel,
} from "@/lib/utils";

describe("hydrateUrl", () => {
  it("prefixes a bare host with https://", () => {
    expect(hydrateUrl("example.com")).toBe("https://example.com");
  });

  it("leaves a URL with a protocol untouched", () => {
    expect(hydrateUrl("http://example.com")).toBe("http://example.com");
    expect(hydrateUrl("https://example.com")).toBe("https://example.com");
  });
});

describe("isValidUrl", () => {
  it("accepts http/https URLs with a real domain", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://sub.example.com/path")).toBe(true);
  });

  it("rejects missing, empty, or malformed input", () => {
    expect(isValidUrl(undefined)).toBe(false);
    expect(isValidUrl(null)).toBe(false);
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("not a url")).toBe(false);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects hosts without a real domain", () => {
    expect(isValidUrl("https://localhost")).toBe(false);
  });
});

describe("isEmojiOnly", () => {
  it("accepts a single emoji", () => {
    expect(isEmojiOnly("🎉")).toBe(true);
  });

  it("accepts multiple emoji separated by spaces", () => {
    expect(isEmojiOnly("🎉 🔥")).toBe(true);
  });

  it("rejects plain text", () => {
    expect(isEmojiOnly("hello")).toBe(false);
  });

  it("rejects text mixed with an emoji", () => {
    expect(isEmojiOnly("hi 🎉")).toBe(false);
  });

  it("rejects strings longer than 13 characters", () => {
    expect(isEmojiOnly("🎉".repeat(20))).toBe(false);
  });
});

describe("shortUrlLabel", () => {
  it("drops the scheme, www, tracking parameters and trailing slash", () => {
    expect(
      shortUrlLabel(
        "https://www.bbc.co.uk/news/?at_medium=RSS&utm_source=x&fbclid=y#top",
      ),
    ).toBe("bbc.co.uk/news");
  });

  it("keeps query parameters that identify the page", () => {
    expect(shortUrlLabel("https://www.youtube.com/watch?v=abc&si=share")).toBe(
      "youtube.com/watch?v=abc",
    );
    expect(shortUrlLabel("https://www.youtube.com/watch?v=xyz")).not.toBe(
      shortUrlLabel("https://www.youtube.com/watch?v=abc"),
    );
  });

  it("cuts long links with an ellipsis", () => {
    const label = shortUrlLabel(
      "https://example.com/articles/an-unusually-long-headline-slug-for-a-story",
    );
    expect(label).toBe("example.com/articles/an-unusually-long-…");
    expect(label.length).toBe(40);
  });

  it("names Google News story links instead of showing their opaque path", () => {
    for (const url of [
      "https://news.google.com/rss/articles/CBMiiwFBVV95cUxOdU9UNW1Wd053ajBlNE5WSEl1VUQ2QzNVODdr?oc=5",
      "https://news.google.com/articles/CBMiiwFBVV95cUxO",
    ]) {
      expect(shortUrlLabel(url)).toBe("Google News story");
    }
    expect(shortUrlLabel("https://news.google.com/topics/abc")).toBe(
      "news.google.com/topics/abc",
    );
  });

  it("keeps a path with a bare % instead of throwing", () => {
    expect(shortUrlLabel("https://example.com/50%off")).toBe(
      "example.com/50%off",
    );
  });

  it("handles links without a scheme and leaves junk alone", () => {
    expect(shortUrlLabel("www.example.com/a")).toBe("example.com/a");
    expect(shortUrlLabel("http://%")).toBe("http://%");
  });
});
