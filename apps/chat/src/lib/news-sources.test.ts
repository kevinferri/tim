import { describe, expect, it } from "vitest";
import {
  NEWS_PRESETS,
  exactPreset,
  googleNewsTopicUrl,
  suggestPresets,
  topicTitle,
} from "./news-sources";

describe("googleNewsTopicUrl", () => {
  it("encodes the topic into a Google News search feed", () => {
    expect(googleNewsTopicUrl(" Taylor Swift ")).toBe(
      "https://news.google.com/rss/search?q=taylor%20swift&hl=en-US&gl=US&ceid=US:en",
    );
  });

  it("gives topics that differ only in case or spacing one feed", () => {
    expect(googleNewsTopicUrl("Knicks")).toBe(googleNewsTopicUrl(" knicks "));
    expect(googleNewsTopicUrl("Taylor  Swift")).toBe(
      googleNewsTopicUrl("taylor swift"),
    );
  });
});

describe("topicTitle", () => {
  it("keeps the topic as typed, tidied", () => {
    expect(topicTitle("  Taylor   Swift ")).toBe("Taylor Swift · Google News");
  });
});

describe("suggestPresets", () => {
  const names = (query: string, followed: string[] = []) =>
    suggestPresets(query, new Set(followed)).map((p) => p.name);

  it("offers popular sites before anything is typed", () => {
    expect(names("")).toContain("BBC News");
    expect(names("").length).toBeLessThanOrEqual(8);
  });

  it("matches names first, then subjects", () => {
    expect(names("verge")).toEqual(["The Verge"]);
    expect(names("new york")).toEqual(["New York Times", "The New Yorker"]);
    expect(names("gaming")).toContain("IGN");
  });

  it("leaves out sites already followed", () => {
    const verge = NEWS_PRESETS.find((p) => p.name === "The Verge")!;
    expect(names("verge", [verge.url])).toEqual([]);
  });

  it("finds nothing for a plain topic", () => {
    expect(names("Knicks")).toEqual([]);
  });
});

describe("exactPreset", () => {
  it("matches a site's full name, ignoring case and spacing", () => {
    expect(exactPreset("  the verge ")?.name).toBe("The Verge");
    expect(exactPreset("verge")).toBeNull();
  });
});
