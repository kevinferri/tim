import { describe, expect, it } from "vitest";
import { getEasternDate, getNextEasternMidnight } from "./day";

describe("getNextEasternMidnight", () => {
  it("returns midnight Eastern in standard time", () => {
    const next = getNextEasternMidnight(new Date("2026-11-11T18:30:00Z"));
    expect(next.toISOString()).toBe("2026-11-12T05:00:00.000Z");
  });

  it("returns midnight Eastern in daylight time", () => {
    const next = getNextEasternMidnight(new Date("2026-07-07T12:00:00Z"));
    expect(next.toISOString()).toBe("2026-07-08T04:00:00.000Z");
  });

  it("moves to the following day when it's exactly midnight", () => {
    const midnight = new Date("2026-11-11T05:00:00Z");
    expect(getEasternDate(getNextEasternMidnight(midnight))).toBe("2026-11-12");
  });

  it("includes weekends", () => {
    const friday = new Date("2026-11-13T18:30:00Z");
    expect(getNextEasternMidnight(friday).toISOString()).toBe(
      "2026-11-14T05:00:00.000Z",
    );
  });

  it("handles the night clocks fall back", () => {
    const next = getNextEasternMidnight(new Date("2026-11-01T12:00:00Z"));
    expect(next.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
});
