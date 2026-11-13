import { describe, expect, it } from "vitest";
import {
  gameDayOrdinal,
  getGameDate,
  getNextGameDayAt,
  isGameDay,
} from "./day";

describe("getNextGameDayAt", () => {
  it("returns midnight Eastern in standard time", () => {
    const next = getNextGameDayAt(new Date("2026-11-11T18:30:00Z"));
    expect(next.toISOString()).toBe("2026-11-12T05:00:00.000Z");
  });

  it("returns midnight Eastern in daylight time", () => {
    const next = getNextGameDayAt(new Date("2026-07-07T12:00:00Z"));
    expect(next.toISOString()).toBe("2026-07-08T04:00:00.000Z");
  });

  it("moves to the following day when it's exactly midnight", () => {
    const midnight = new Date("2026-11-11T05:00:00Z");
    expect(getGameDate(getNextGameDayAt(midnight))).toBe("2026-11-12");
  });

  it("skips the weekend", () => {
    const friday = new Date("2026-11-13T18:30:00Z");
    const saturday = new Date("2026-11-14T18:30:00Z");
    const monday = "2026-11-16T05:00:00.000Z";
    expect(getNextGameDayAt(friday).toISOString()).toBe(monday);
    expect(getNextGameDayAt(saturday).toISOString()).toBe(monday);
  });

  it("handles the night clocks fall back", () => {
    const next = getNextGameDayAt(new Date("2026-11-01T12:00:00Z"));
    expect(next.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
});

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
