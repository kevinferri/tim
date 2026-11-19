import { describe, expect, it } from "vitest";
import { googleNewsTopicUrl, looksLikeUrl } from "./news-api";

describe("looksLikeUrl", () => {
  it("treats addresses as links", () => {
    for (const v of [
      "bbc.com",
      "www.theverge.com/rss",
      "https://news.google.com/rss/search?q=Knicks&hl=en-US",
      " http://example.com ",
    ]) {
      expect(looksLikeUrl(v), v).toBe(true);
    }
  });

  it("treats words as topics", () => {
    for (const v of ["Knicks", "Taylor Swift", "AI", "St. Louis Cardinals"]) {
      expect(looksLikeUrl(v), v).toBe(false);
    }
  });
});

describe("googleNewsTopicUrl", () => {
  it("encodes the topic into a Google News search feed", () => {
    expect(googleNewsTopicUrl(" Taylor Swift ")).toBe(
      "https://news.google.com/rss/search?q=Taylor%20Swift&hl=en-US&gl=US&ceid=US:en",
    );
  });
});
