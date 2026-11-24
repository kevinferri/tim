import { describe, expect, it } from "vitest";
import {
  formatKickoffDay,
  formatKickoffTime,
  formatSpread,
  formatWeekLabel,
  groupByKickoffDay,
  spreadForSide,
} from "./format";

describe("formatSpread", () => {
  it("signs the number the way a line is read", () => {
    expect(formatSpread(-3.5)).toBe("-3.5");
    expect(formatSpread(7)).toBe("+7");
    expect(formatSpread(-10)).toBe("-10");
  });

  it("calls an even game a pick'em", () => {
    expect(formatSpread(0)).toBe("PK");
  });
});

describe("spreadForSide", () => {
  it("flips the home line for the away team", () => {
    expect(spreadForSide(-3.5, "home")).toBe(-3.5);
    expect(spreadForSide(-3.5, "away")).toBe(3.5);
  });
});

describe("kickoff formatting", () => {
  // 2026-11-27T01:15:00Z is Thursday 8:15pm Eastern, not Friday.
  it("places a late kickoff on its Eastern day", () => {
    expect(formatKickoffDay("2026-11-27T01:15:00.000Z")).toBe("Thu, Nov 26");
    expect(formatKickoffTime("2026-11-27T01:15:00.000Z")).toBe("8:15 PM");
  });
});

describe("formatWeekLabel", () => {
  it("reads the week start as an Eastern date, not a local one", () => {
    expect(formatWeekLabel("2026-11-23")).toBe("Week of Nov 23");
  });
});

describe("groupByKickoffDay", () => {
  it("sections consecutive games by Eastern day", () => {
    const groups = groupByKickoffDay([
      { kickoffAt: "2026-11-27T01:15:00.000Z" },
      { kickoffAt: "2026-11-29T18:00:00.000Z" },
      { kickoffAt: "2026-11-29T21:05:00.000Z" },
    ]);
    expect(groups.map((g) => [g.day, g.games.length])).toEqual([
      ["Thu, Nov 26", 1],
      ["Sun, Nov 29", 2],
    ]);
  });
});
