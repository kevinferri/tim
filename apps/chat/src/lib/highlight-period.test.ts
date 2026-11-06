import { describe, it, expect } from "vitest";
import { getHighlightPeriodStart } from "./highlight-period";

const now = new Date(2026, 10, 5, 14, 30); // Thu Nov 5 2026, 2:30 PM local

describe("getHighlightPeriodStart", () => {
  it.each([
    ["day", new Date(2026, 10, 5)],
    ["week", new Date(2026, 10, 1)], // Sunday
    ["month", new Date(2026, 10, 1)],
    ["year", new Date(2026, 0, 1)],
  ] as const)("%s starts at the calendar boundary", (period, expected) => {
    expect(getHighlightPeriodStart(period, now)).toEqual(expected);
  });

  it("crosses a month boundary for week", () => {
    const tue = new Date(2026, 8, 1, 9); // Tue Sep 1 2026
    expect(getHighlightPeriodStart("week", tue)).toEqual(new Date(2026, 7, 30));
  });

  it("is unbounded for allTime", () => {
    expect(getHighlightPeriodStart("allTime", now)).toBeUndefined();
  });
});
