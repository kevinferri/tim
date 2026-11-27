/**
 * Stands in for The Odds API when THE_ODDS_API_KEY isn't set locally, so the
 * game is playable in dev without a key. Real team names and plausible lines,
 * with kickoffs placed relative to the slate window so they behave like a live
 * week: one already started (locked), the rest still open.
 */

import type { FinalScore, SlateGame } from "../lib/odds";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const FIXTURE_GAMES = [
  {
    away: "Dallas Cowboys",
    home: "Philadelphia Eagles",
    spread: -3.5,
    inDays: -0.5,
  },
  { away: "Green Bay Packers", home: "Chicago Bears", spread: 2.5, inDays: 3 },
  { away: "Kansas City Chiefs", home: "Denver Broncos", spread: 6, inDays: 6 },
  {
    away: "Buffalo Bills",
    home: "New England Patriots",
    spread: 7.5,
    inDays: 6,
  },
  {
    away: "San Francisco 49ers",
    home: "Seattle Seahawks",
    spread: -1.5,
    inDays: 6.2,
  },
  { away: "Detroit Lions", home: "Minnesota Vikings", spread: 3, inDays: 7 },
];

export function LOCAL_DEV_SLATE(from: Date): SlateGame[] {
  return FIXTURE_GAMES.map((game, index) => ({
    eventId: `local-dev-${from.toISOString().slice(0, 10)}-${index}`,
    homeTeam: game.home,
    awayTeam: game.away,
    kickoffAt: new Date(from.getTime() + game.inDays * DAY_MS),
    spread: game.spread,
  }));
}

// Empty by default: a fixture slate's games have no real results, and inventing
// scores for ids that only exist in this process would grade picks against
// nothing. Dev grading is exercised by the tests instead.
export const LOCAL_DEV_SCORES: FinalScore[] = [];
