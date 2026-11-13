import { describe, expect, it } from "vitest";
import { formatGameDate, gameDayOrdinal, isGameDay } from "./day";

describe("game days", () => {
  it("are weekdays only", () => {
    expect(isGameDay("2026-11-13")).toBe(true);
    expect(isGameDay("2026-11-14")).toBe(false);
    expect(isGameDay("2026-11-15")).toBe(false);
    expect(isGameDay("2026-11-16")).toBe(true);
  });

  it("count Friday to Monday as consecutive", () => {
    const friday = gameDayOrdinal("2026-11-13");
    expect(gameDayOrdinal("2026-11-12")).toBe(friday - 1);
    expect(gameDayOrdinal("2026-11-16")).toBe(friday + 1);
    expect(gameDayOrdinal("2026-11-14")).toBe(friday + 1);
    expect(gameDayOrdinal("2026-11-15")).toBe(friday + 1);
  });
});

describe("formatGameDate", () => {
  it("labels the game date itself, whatever the viewer's time zone", () => {
    expect(formatGameDate("2026-11-13")).toBe("Friday, Nov 13");
    expect(formatGameDate("2027-01-04")).toBe("Monday, Jan 4");
  });
});
