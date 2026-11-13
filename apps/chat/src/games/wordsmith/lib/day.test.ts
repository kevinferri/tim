import { describe, expect, it } from "vitest";
import { gameDayOrdinal, isGameDay } from "./day";

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
