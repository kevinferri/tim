/**
 * The Odds API v4 client, used for two things only: the week's spreads and
 * final scores. https://the-odds-api.com/liveapi/guides/v4/
 *
 * Quota matters -- the free plan is 500 credits a month. A spreads call costs
 * 1 (markets x regions) no matter how many games come back; a scores call with
 * daysFrom costs 2. The caller decides when to spend them: see server/jobs.ts,
 * which skips the scores call entirely when nothing is waiting to be graded.
 */

import {
  toFinalScores,
  toSlateGames,
  type FinalScore,
  type OddsApiEvent,
  type OddsApiScoreEvent,
  type SlateGame,
} from "../lib/odds";
import { LOCAL_DEV_SCORES, LOCAL_DEV_SLATE } from "./fixtures";

const BASE_URL = "https://api.the-odds-api.com/v4/sports/americanfootball_nfl";

// daysFrom's documented ceiling; also what makes a scores call cost 2 credits.
const SCORES_DAYS_FROM = 3;

export class OddsApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OddsApiError";
  }
}

/**
 * Local dev without a key gets canned, real-shaped data rather than failing,
 * the same way Giphy and YouTube lookups do. Never in production: there a
 * missing key is a misconfiguration, and silently serving a fake slate people
 * could pick against would be worse than an error.
 */
function shouldServeFixtures() {
  return process.env.NODE_ENV !== "production" && !process.env.THE_ODDS_API_KEY;
}

function requireKey() {
  const key = process.env.THE_ODDS_API_KEY;
  if (!key) throw new OddsApiError("THE_ODDS_API_KEY is not set");
  return key;
}

async function getJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    // The body carries the API's own reason (bad key, quota exhausted); it's
    // short and has no secrets in it, so it's worth keeping in the log.
    const body = await response.text().catch(() => "");
    throw new OddsApiError(
      `${url.pathname} responded ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

/** Spreads for every NFL game kicking off in the window, median across books. */
export async function fetchSlate(window: {
  from: Date;
  to: Date;
}): Promise<SlateGame[]> {
  if (shouldServeFixtures()) return LOCAL_DEV_SLATE(window.from);

  const url = new URL(`${BASE_URL}/odds`);
  url.searchParams.set("apiKey", requireKey());
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "spreads");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("commenceTimeFrom", toApiTime(window.from));
  url.searchParams.set("commenceTimeTo", toApiTime(window.to));

  return toSlateGames(await getJson<OddsApiEvent[]>(url));
}

/** Final scores for games that finished in the last few days. */
export async function fetchFinalScores(): Promise<FinalScore[]> {
  if (shouldServeFixtures()) return LOCAL_DEV_SCORES;

  const url = new URL(`${BASE_URL}/scores`);
  url.searchParams.set("apiKey", requireKey());
  url.searchParams.set("daysFrom", String(SCORES_DAYS_FROM));

  return toFinalScores(await getJson<OddsApiScoreEvent[]>(url));
}

/** The API wants ISO 8601 with no milliseconds. */
function toApiTime(date: Date): string {
  return `${date.toISOString().split(".")[0]}Z`;
}
