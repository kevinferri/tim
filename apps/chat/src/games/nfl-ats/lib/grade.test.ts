import { describe, it, expect } from "vitest";
import {
  formatRecord,
  getCoveringSide,
  gradePick,
  tallyResults,
  winPercentage,
  formatWinPercentage,
} from "./grade";

describe("getCoveringSide", () => {
  it("gives it to the favorite only when it wins by more than the spread", () => {
    // Home favored by 3.5, wins by 7.
    expect(
      getCoveringSide({ spread: -3.5, homeScore: 24, awayScore: 17 }),
    ).toBe("home");
    // Same line, wins by 3 -- not enough.
    expect(
      getCoveringSide({ spread: -3.5, homeScore: 20, awayScore: 17 }),
    ).toBe("away");
  });

  it("gives it to the underdog when it loses by less than the spread", () => {
    // Home getting 7, loses by 3.
    expect(getCoveringSide({ spread: 7, homeScore: 21, awayScore: 24 })).toBe(
      "home",
    );
  });

  it("gives it to the underdog outright when it wins", () => {
    expect(getCoveringSide({ spread: 7, homeScore: 27, awayScore: 24 })).toBe(
      "home",
    );
  });

  it("pushes when a whole-number spread lands exactly", () => {
    // Home favored by 3, wins by exactly 3.
    expect(getCoveringSide({ spread: -3, homeScore: 24, awayScore: 21 })).toBe(
      "push",
    );
  });

  it("never pushes on a half-point spread", () => {
    expect(
      getCoveringSide({ spread: -3.5, homeScore: 24, awayScore: 21 }),
    ).toBe("away");
  });

  it("handles a pick'em, where the spread is zero", () => {
    expect(getCoveringSide({ spread: 0, homeScore: 24, awayScore: 21 })).toBe(
      "home",
    );
    expect(getCoveringSide({ spread: 0, homeScore: 21, awayScore: 21 })).toBe(
      "push",
    );
  });
});

describe("gradePick", () => {
  const game = { spread: -3.5, homeScore: 24, awayScore: 17 };

  it("wins for the side that covered and loses for the other", () => {
    expect(gradePick({ ...game, side: "home" })).toBe("win");
    expect(gradePick({ ...game, side: "away" })).toBe("loss");
  });

  it("pushes both sides when the game pushed", () => {
    const pushed = { spread: -3, homeScore: 24, awayScore: 21 };
    expect(gradePick({ ...pushed, side: "home" })).toBe("push");
    expect(gradePick({ ...pushed, side: "away" })).toBe("push");
  });
});

describe("tallyResults", () => {
  it("counts each result and ignores ungraded picks", () => {
    expect(tallyResults(["win", "loss", "win", "push", null, "win"])).toEqual({
      wins: 3,
      losses: 1,
      pushes: 1,
    });
  });

  it("is all zeroes for no picks", () => {
    expect(tallyResults([])).toEqual({ wins: 0, losses: 0, pushes: 0 });
  });
});

describe("formatRecord", () => {
  it("leaves pushes out when there are none", () => {
    expect(formatRecord({ wins: 7, losses: 3, pushes: 0 })).toBe("7-3");
  });

  it("appends pushes when there are some", () => {
    expect(formatRecord({ wins: 7, losses: 3, pushes: 1 })).toBe("7-3-1");
  });
});

describe("winPercentage", () => {
  it("is wins over decided picks", () => {
    expect(winPercentage({ wins: 7, losses: 3, pushes: 0 })).toBeCloseTo(0.7);
  });

  it("leaves pushes out of the denominator", () => {
    expect(winPercentage({ wins: 7, losses: 3, pushes: 5 })).toBeCloseTo(0.7);
  });

  it("is null when nothing has been decided", () => {
    expect(winPercentage({ wins: 0, losses: 0, pushes: 2 })).toBeNull();
  });
});

describe("formatWinPercentage", () => {
  it("drops the leading zero", () => {
    expect(formatWinPercentage({ wins: 7, losses: 3, pushes: 0 })).toBe(".700");
    expect(formatWinPercentage({ wins: 2, losses: 1, pushes: 0 })).toBe(".667");
  });

  it("shows a dash rather than .000 before anything is decided", () => {
    expect(formatWinPercentage({ wins: 0, losses: 0, pushes: 0 })).toBe(
      "\u2014",
    );
  });

  it("keeps a perfect record readable", () => {
    expect(formatWinPercentage({ wins: 3, losses: 0, pushes: 0 })).toBe(
      "1.000",
    );
  });
});
