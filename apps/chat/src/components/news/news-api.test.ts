import { describe, expect, it } from "vitest";
import { googleNewsTopicUrl, looksLikeUrl, mergeLiveItems } from "./news-api";

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

describe("mergeLiveItems", () => {
  const story = (id: string, minutesAgo: number) => ({
    id,
    feedId: "f",
    title: id,
    link: `https://example.com/${id}`,
    summary: null,
    imageUrl: null,
    publishedAt: new Date(
      Date.UTC(2026, 10, 19, 12) - minutesAgo * 60_000,
    ).toISOString(),
    createdAt: new Date(Date.UTC(2026, 10, 19, 12)).toISOString(),
  });
  const page = (
    items: ReturnType<typeof story>[],
    nextCursor: string | null,
  ) => ({
    sources: [],
    items,
    nextCursor,
  });
  const ids = (pages: { items: { id: string }[] }[] | null) =>
    pages?.map((p) => p.items.map((i) => i.id));

  it("inserts a new story in date order instead of at the top", () => {
    const pages = [
      page([story("a", 0), story("c", 20)], "cur"),
      page([story("d", 30), story("e", 40)], "cur2"),
    ];
    expect(
      ids(mergeLiveItems(pages, [story("b", 10), story("new", -5)])),
    ).toEqual([
      ["new", "a", "b", "c"],
      ["d", "e"],
    ]);
  });

  it("leaves a story older than everything loaded for the next page", () => {
    const pages = [page([story("a", 0), story("b", 10)], "cursor")];
    expect(mergeLiveItems(pages, [story("old", 600)])).toBeNull();
  });

  it("appends an older story when there's nothing more to load", () => {
    const pages = [page([story("a", 0)], null)];
    expect(ids(mergeLiveItems(pages, [story("old", 600)]))).toEqual([
      ["a", "old"],
    ]);
  });

  it("skips stories already listed by id or link", () => {
    const pages = [page([story("a", 0)], null)];
    expect(
      mergeLiveItems(pages, [
        story("a", 0),
        { ...story("z", 5), link: "https://example.com/a" },
      ]),
    ).toBeNull();
  });
});
