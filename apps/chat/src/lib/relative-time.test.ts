import { describe, it, expect } from "vitest";
import { formatFeedTime, formatTranscriptTime } from "./relative-time";

// Local-time constructors, so these hold in any machine timezone. Newer ICU
// puts a narrow no-break space before AM/PM; normalize it for readability.
const now = new Date(2026, 8, 29, 16, 43); // Tue Sep 29 2026, 4:43 PM
const at = (...args: [number, number, number, number, number]) =>
  new Date(...args);
const clean = (s: string) => s.replace(/ /g, " ");

describe("formatFeedTime", () => {
  it.each([
    ["under a minute", new Date(2026, 8, 29, 16, 42, 30), "just now"],
    ["exactly a minute", at(2026, 8, 29, 16, 42), "1m ago"],
    ["slightly in the future", at(2026, 8, 29, 16, 44), "just now"],
    ["minutes", at(2026, 8, 29, 16, 39), "4m ago"],
    ["hours, same day", at(2026, 8, 29, 13, 10), "3h ago"],
    ["early this morning", at(2026, 8, 29, 0, 5), "16h ago"],
    ["yesterday, under 24h ago", at(2026, 8, 28, 23, 50), "Yesterday"],
    ["two days", at(2026, 8, 27, 23, 25), "2d ago"],
    ["within the week", at(2026, 8, 23, 12, 0), "6d ago"],
    ["older, same year", at(2026, 8, 22, 12, 0), "Sep 22"],
    ["older, previous year", at(2025, 11, 31, 12, 0), "Dec 31, 2025"],
  ])("%s", (_, date, expected) => {
    expect(clean(formatFeedTime(date, now))).toBe(expected);
  });
});

describe("formatTranscriptTime", () => {
  it.each([
    ["under a minute", new Date(2026, 8, 29, 16, 42, 30), "Just now"],
    ["slightly in the future", at(2026, 8, 29, 16, 44), "Just now"],
    ["exactly a minute", at(2026, 8, 29, 16, 42), "Today at 4:42 PM"],
    ["today", at(2026, 8, 29, 9, 5), "Today at 9:05 AM"],
    ["yesterday", at(2026, 8, 28, 23, 50), "Yesterday at 11:50 PM"],
    ["older, same year", at(2026, 8, 23, 16, 43), "Sep 23, 4:43 PM"],
    ["older, previous year", at(2025, 11, 31, 8, 0), "Dec 31, 2025, 8:00 AM"],
  ])("%s", (_, date, expected) => {
    expect(clean(formatTranscriptTime(date, now))).toBe(expected);
  });
});
