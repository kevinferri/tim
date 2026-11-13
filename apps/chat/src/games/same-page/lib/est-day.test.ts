import { describe, expect, it } from "vitest";
import { getNextAlertAt } from "./est-day";

describe("getNextAlertAt", () => {
  it.each([
    // [now (UTC), next alert (UTC)] -- EST is UTC-5 in November
    ["Mon 5:30am → Mon 6am", "2026-11-09T10:30:00Z", "2026-11-09T11:00:00Z"],
    [
      "Mon 6am exactly → Mon 2pm",
      "2026-11-09T11:00:00Z",
      "2026-11-09T19:00:00Z",
    ],
    ["Mon 3pm → Mon 4pm", "2026-11-09T20:00:00Z", "2026-11-09T21:00:00Z"],
    ["Mon 5pm → Tue 6am", "2026-11-09T22:00:00Z", "2026-11-10T11:00:00Z"],
    ["Fri 5pm → Mon 6am", "2026-11-13T22:00:00Z", "2026-11-16T11:00:00Z"],
    // EDT is UTC-4 in July
    [
      "summer Mon 5pm → Tue 6am EDT",
      "2026-07-13T21:00:00Z",
      "2026-07-14T10:00:00Z",
    ],
  ])("%s", (_label, now, expected) => {
    expect(getNextAlertAt(new Date(now)).toISOString()).toBe(
      new Date(expected).toISOString(),
    );
  });

  it("handles the night clocks fall back", () => {
    // Sun Nov 1, 2026 is the DST change; next alert is Mon 6am EST.
    expect(getNextAlertAt(new Date("2026-10-31T23:00:00Z")).toISOString()).toBe(
      "2026-11-02T11:00:00.000Z",
    );
  });
});
