import { describe, it, expect } from "vitest";
import {
  getHomeSpread,
  median,
  toFinalScores,
  toSlateGames,
  type OddsApiEvent,
} from "./odds";

function event(overrides: Partial<OddsApiEvent> = {}): OddsApiEvent {
  return {
    id: "evt-1",
    commence_time: "2026-11-30T18:00:00Z",
    home_team: "Philadelphia Eagles",
    away_team: "Dallas Cowboys",
    bookmakers: [book(-3.5), book(-3.5), book(-4)],
    ...overrides,
  };
}

function book(homePoint: number, key = "bk") {
  return {
    key,
    markets: [
      {
        key: "spreads",
        outcomes: [
          { name: "Philadelphia Eagles", point: homePoint },
          { name: "Dallas Cowboys", point: -homePoint },
        ],
      },
    ],
  };
}

describe("median", () => {
  it("takes the middle of an odd-length list", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("averages the middle two of an even-length list", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("is undefined for nothing", () => {
    expect(median([])).toBeUndefined();
  });
});

describe("getHomeSpread", () => {
  it("takes the median of the home team's line across books", () => {
    expect(getHomeSpread(event())).toBe(-3.5);
  });

  it("ignores a book that doesn't price spreads", () => {
    const totalsOnly = {
      key: "totals-only",
      markets: [{ key: "totals", outcomes: [{ name: "Over", point: 44.5 }] }],
    };
    expect(getHomeSpread(event({ bookmakers: [book(-7), totalsOnly] }))).toBe(
      -7,
    );
  });

  it("is undefined when no book prices the game", () => {
    expect(getHomeSpread(event({ bookmakers: [] }))).toBeUndefined();
  });

  it("is not swayed past the median by one outlier book", () => {
    expect(
      getHomeSpread(event({ bookmakers: [book(-3), book(-3), book(-14)] })),
    ).toBe(-3);
  });
});

describe("toSlateGames", () => {
  it("maps a priced event", () => {
    const [game] = toSlateGames([event()]);
    expect(game).toMatchObject({
      eventId: "evt-1",
      homeTeam: "Philadelphia Eagles",
      awayTeam: "Dallas Cowboys",
      spread: -3.5,
    });
    expect(game.kickoffAt.toISOString()).toBe("2026-11-30T18:00:00.000Z");
  });

  it("drops events with no spread, so nothing unpickable reaches the slate", () => {
    expect(toSlateGames([event({ bookmakers: [] })])).toEqual([]);
  });

  it("drops events with an unusable kickoff", () => {
    expect(toSlateGames([event({ commence_time: "not-a-date" })])).toEqual([]);
  });
});

describe("toFinalScores", () => {
  const scored = {
    id: "evt-1",
    completed: true,
    home_team: "Philadelphia Eagles",
    away_team: "Dallas Cowboys",
    scores: [
      { name: "Philadelphia Eagles", score: "24" },
      { name: "Dallas Cowboys", score: "17" },
    ],
  };

  it("maps a completed game", () => {
    expect(toFinalScores([scored])).toEqual([
      { eventId: "evt-1", homeScore: 24, awayScore: 17 },
    ]);
  });

  it("skips a game still in progress", () => {
    expect(toFinalScores([{ ...scored, completed: false }])).toEqual([]);
  });

  it("skips a completed game with no scores attached", () => {
    expect(toFinalScores([{ ...scored, scores: null }])).toEqual([]);
  });

  it("skips a game missing one side's score", () => {
    expect(
      toFinalScores([
        { ...scored, scores: [{ name: "Philadelphia Eagles", score: "24" }] },
      ]),
    ).toEqual([]);
  });
});
