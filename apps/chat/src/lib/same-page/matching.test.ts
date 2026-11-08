import { afterEach, describe, expect, it } from "vitest";
import {
  answersMatch,
  clusterMatchKeys,
  isValidAnswerText,
  toMatchKey,
} from "./matching";
import {
  getEstGameDate,
  getEstHour,
  getSamePagePhase,
  isEstWeekday,
  isSamePageActiveDay,
} from "./est-day";

describe("toMatchKey / answersMatch", () => {
  it("ignores case, spacing, and punctuation", () => {
    expect(toMatchKey("Rubber Band")).toBe(toMatchKey("rubber-band"));
    expect(answersMatch("French Fries", "french fries")).toBe(true);
  });

  it("merges simple plurals and synonyms", () => {
    expect(answersMatch("fries", "french fries")).toBe(true);
    expect(answersMatch("paperclip", "paper clips")).toBe(true);
  });

  it("keeps guarded near-homographs distinct", () => {
    expect(answersMatch("cat", "car")).toBe(false);
  });

  it("allows small typos on longer tokens", () => {
    expect(answersMatch("paul", "paull")).toBe(true);
  });
});

describe("isValidAnswerText", () => {
  it("allows up to 3 words", () => {
    expect(isValidAnswerText("one")).toBe(true);
    expect(isValidAnswerText("one two three")).toBe(true);
    expect(isValidAnswerText("one two three four")).toBe(false);
    expect(isValidAnswerText("   ")).toBe(false);
  });
});

describe("clusterMatchKeys", () => {
  it("unions typo variants into one cluster root", () => {
    const map = clusterMatchKeys(["Paul", "paull", "Ringo"]);
    expect(map.get("Paul")).toBe(map.get("paull"));
    expect(map.get("Paul")).not.toBe(map.get("Ringo"));
  });
});

describe("est-day phase", () => {
  const prevPhase = process.env.SAME_PAGE_FORCE_PHASE;
  const prevHour = process.env.SAME_PAGE_FORCE_HOUR;

  afterEach(() => {
    if (prevPhase === undefined) delete process.env.SAME_PAGE_FORCE_PHASE;
    else process.env.SAME_PAGE_FORCE_PHASE = prevPhase;
    if (prevHour === undefined) delete process.env.SAME_PAGE_FORCE_HOUR;
    else process.env.SAME_PAGE_FORCE_HOUR = prevHour;
  });

  it("returns YYYY-MM-DD for America/New_York", () => {
    // 2026-11-09 05:00 UTC = 2026-11-09 00:00 EST
    const d = new Date("2026-11-09T05:00:00.000Z");
    expect(getEstGameDate(d)).toBe("2026-11-09");
  });

  it("is closed on weekends", () => {
    delete process.env.SAME_PAGE_FORCE_PHASE;
    // Saturday Nov 7, 2026 15:00 EST = 20:00 UTC
    const sat = new Date("2026-11-07T20:00:00.000Z");
    expect(isEstWeekday(sat)).toBe(false);
    expect(getSamePagePhase(sat)).toBe("closed");
  });

  it("is play between 6am and 4pm weekday EST", () => {
    delete process.env.SAME_PAGE_FORCE_PHASE;
    // Monday Nov 9, 2026 10:00 EST = 15:00 UTC
    const mid = new Date("2026-11-09T15:00:00.000Z");
    expect(getSamePagePhase(mid)).toBe("play");
  });

  it("is results after 4pm weekday EST", () => {
    delete process.env.SAME_PAGE_FORCE_PHASE;
    // Monday Nov 9, 2026 16:30 EST = 21:30 UTC
    const after = new Date("2026-11-09T21:30:00.000Z");
    expect(getSamePagePhase(after)).toBe("results");
  });

  it("is closed before 6am weekday EST", () => {
    delete process.env.SAME_PAGE_FORCE_PHASE;
    // Monday Nov 9, 2026 5:00 EST = 10:00 UTC
    const early = new Date("2026-11-09T10:00:00.000Z");
    expect(getSamePagePhase(early)).toBe("closed");
  });

  it("honors SAME_PAGE_FORCE_PHASE over the clock", () => {
    process.env.SAME_PAGE_FORCE_PHASE = "play";
    const sat = new Date("2026-11-07T20:00:00.000Z");
    expect(getSamePagePhase(sat)).toBe("play");
  });

  it("treats forced play/results as active scheduler days", () => {
    process.env.SAME_PAGE_FORCE_PHASE = "play";
    const sat = new Date("2026-11-07T20:00:00.000Z");
    expect(isSamePageActiveDay(sat)).toBe(true);

    process.env.SAME_PAGE_FORCE_PHASE = "closed";
    expect(isSamePageActiveDay(sat)).toBe(false);
  });

  it("honors SAME_PAGE_FORCE_HOUR for scheduler hour checks", () => {
    process.env.SAME_PAGE_FORCE_HOUR = "14";
    expect(getEstHour(new Date("2026-11-09T15:00:00.000Z"))).toBe(14);
  });
});
