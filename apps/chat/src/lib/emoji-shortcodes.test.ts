import { beforeAll, describe, it, expect } from "vitest";
import {
  emojiForShortcode,
  findClosedShortcode,
  findOpenShortcode,
  loadEmojiData,
  replaceShortcodes,
  searchEmojis,
} from "@/lib/emoji-shortcodes";

beforeAll(() => loadEmojiData());

describe("emojiForShortcode", () => {
  it("resolves ids, aliases and Slack-style names", () => {
    expect(emojiForShortcode("smile")).toBe("😄");
    expect(emojiForShortcode("satisfied")).toBe("😆");
    expect(emojiForShortcode("thumbsup")).toBe("👍");
    expect(emojiForShortcode("+1")).toBe("👍");
    expect(emojiForShortcode("SMILE")).toBe("😄");
  });

  it("returns undefined for unknown codes", () => {
    expect(emojiForShortcode("not_a_real_emoji")).toBeUndefined();
  });
});

describe("replaceShortcodes", () => {
  it("replaces known shortcodes inline", () => {
    expect(replaceShortcodes("nice :tada: work :+1:")).toBe("nice 🎉 work 👍");
    expect(replaceShortcodes(":fire::fire:")).toBe("🔥🔥");
  });

  it("leaves unknown codes and times alone", () => {
    expect(replaceShortcodes("hi :nope: there")).toBe("hi :nope: there");
    expect(replaceShortcodes("at 12:30:45")).toBe("at 12:30:45");
    expect(replaceShortcodes("score 10:100:5")).toBe("score 10:100:5");
  });
});

describe("searchEmojis", () => {
  it("puts an exact id match first", async () => {
    const results = await searchEmojis("smile");
    expect(results[0]).toEqual({ shortcode: "smile", native: "😄" });
  });

  it("matches keywords, not just shortcodes", async () => {
    const results = await searchEmojis("happy");
    expect(results.some((r) => r.native === "😄")).toBe(true);
  });

  it("returns nothing for an empty query", async () => {
    expect(await searchEmojis("")).toEqual([]);
  });
});

describe("findOpenShortcode", () => {
  it("opens after a colon plus 2 chars at a word boundary", () => {
    expect(findOpenShortcode(":sm")).toEqual({ query: "sm", start: 0 });
    expect(findOpenShortcode("hey :thu")).toEqual({ query: "thu", start: 4 });
    expect(findOpenShortcode("🔥:fi")).toEqual({ query: "fi", start: 2 });
  });

  it("stays closed for short queries, times, emoticons and prose", () => {
    expect(findOpenShortcode(":")).toBeUndefined();
    expect(findOpenShortcode(":s")).toBeUndefined();
    expect(findOpenShortcode("at 12:30")).toBeUndefined();
    expect(findOpenShortcode("re:xy")).toBeUndefined();
    expect(findOpenShortcode("re: x")).toBeUndefined();
    expect(findOpenShortcode("hi :)")).toBeUndefined();
    expect(findOpenShortcode(":sm done")).toBeUndefined();
  });
});

describe("findClosedShortcode", () => {
  it("finds a just-closed known shortcode", () => {
    expect(findClosedShortcode("nice :tada:")).toEqual({
      native: "🎉",
      start: 5,
    });
    expect(findClosedShortcode("::fire:")).toEqual({ native: "🔥", start: 1 });
  });

  it("ignores unknown codes and word-adjacent colons", () => {
    expect(findClosedShortcode("hi :nope:")).toBeUndefined();
    expect(findClosedShortcode("10:100:")).toBeUndefined();
    expect(findClosedShortcode("a:fire:")).toBeUndefined();
  });
});
