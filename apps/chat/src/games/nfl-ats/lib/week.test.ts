import { describe, it, expect } from "vitest";
import {
  getEasternWeekday,
  getPreviousWeekStart,
  getSeason,
  getSlateWindow,
  getWeekStart,
} from "./week";

// Eastern is UTC-5 in November, so 2026-11-24T12:00Z is Tuesday morning there.
const TUESDAY = new Date("2026-11-24T12:00:00Z");

describe("getEasternWeekday", () => {
  it("reads the Eastern day, not the UTC one", () => {
    expect(getEasternWeekday(TUESDAY)).toBe(2);
    // 01:00Z Tuesday is still Monday evening in New York.
    expect(getEasternWeekday(new Date("2026-11-24T01:00:00Z"))).toBe(1);
  });
});

describe("getWeekStart", () => {
  it("walks back to the Monday that started the week", () => {
    expect(getWeekStart(TUESDAY)).toBe("2026-11-23");
  });

  it("returns the day itself on a Monday", () => {
    expect(getWeekStart(new Date("2026-11-23T18:00:00Z"))).toBe("2026-11-23");
  });

  it("keeps Sunday with the Monday that opened it, not the one ahead", () => {
    expect(getWeekStart(new Date("2026-11-29T18:00:00Z"))).toBe("2026-11-23");
  });

  it("stays on the Eastern side of midnight", () => {
    // 02:00Z Monday is 9pm Sunday in New York, so the week hasn't rolled yet.
    expect(getWeekStart(new Date("2026-11-23T02:00:00Z"))).toBe("2026-11-16");
  });

  it("is right across the spring DST change", () => {
    // Clocks go forward Sunday 2026-03-08; the week still starts on the 2nd.
    expect(getWeekStart(new Date("2026-03-09T12:00:00Z"))).toBe("2026-03-09");
    expect(getWeekStart(new Date("2026-03-08T18:00:00Z"))).toBe("2026-03-02");
  });
});

describe("getPreviousWeekStart", () => {
  it("is the Monday before this week's", () => {
    expect(getPreviousWeekStart(TUESDAY)).toBe("2026-11-16");
  });

  it("is right across the autumn DST change", () => {
    // Clocks go back Sunday 2026-11-01.
    expect(getPreviousWeekStart(new Date("2026-11-03T12:00:00Z"))).toBe(
      "2026-10-26",
    );
  });
});

describe("getSeason", () => {
  it("names the season for the year it kicked off in", () => {
    expect(getSeason(new Date("2026-11-24T12:00:00Z"))).toBe(2026);
    expect(getSeason(new Date("2026-09-10T12:00:00Z"))).toBe(2026);
  });

  it("keeps January and February with the season before", () => {
    expect(getSeason(new Date("2027-01-10T12:00:00Z"))).toBe(2026);
    expect(getSeason(new Date("2027-02-08T12:00:00Z"))).toBe(2026);
  });
});

describe("getSlateWindow", () => {
  it("reaches eight days past the publish time", () => {
    const { from, to } = getSlateWindow(TUESDAY);
    expect(from).toEqual(TUESDAY);
    expect(to.toISOString()).toBe("2026-12-02T12:00:00.000Z");
  });
});
