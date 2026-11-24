// Client calls and cache keys for the NFL ATS API route.
import type { PickRecord, PickResult, PickSide } from "../lib/grade";

export type PickableGame = {
  id: string;
  awayTeam: string;
  homeTeam: string;
  /** The home team's line, fixed when the slate published. */
  spread: number;
  kickoffAt: string;
  locked: boolean;
  myPick: PickSide | null;
  homeScore: number | null;
  awayScore: number | null;
  myResult: PickResult | null;
};

export type NflAtsState =
  | {
      enabled: true;
      isAdmin: boolean;
      weekStartsOn: string | null;
      games: PickableGame[];
    }
  | { enabled: false; isAdmin: boolean };

export type StandingsMember = {
  id: string;
  displayName: string;
  name: string | null;
  imageUrl: string | null;
};

export type StandingsRow = {
  user: StandingsMember;
  isYou: boolean;
  lastWeek: PickRecord | null;
  season: PickRecord;
  winPct: number | null;
};

export type NflAtsStandings = {
  season: number;
  lastWeekStartsOn: string | null;
  rows: StandingsRow[];
};

type View = "badge" | "standings";

const url = (circleId: string, view?: View) =>
  `/api/circles/${circleId}/nfl-ats${view ? `?view=${view}` : ""}`;

export const nflAtsQueryKey = (circleId: string) => ["nfl-ats", circleId];

export const nflAtsStandingsQueryKey = (circleId: string) => [
  "nfl-ats-standings",
  circleId,
];

export async function fetchNflAts<T = NflAtsState>(
  circleId: string,
  view?: View,
) {
  const res = await fetch(url(circleId, view));
  if (!res.ok) throw new Error("Couldn’t load Pick ’em");
  return (await res.json()) as T;
}

export const fetchStandings = (circleId: string) =>
  fetchNflAts<NflAtsStandings>(circleId, "standings");

/** Throws the route's own error message (e.g. "That game has already kicked off"). */
export async function postNflAts<T = unknown>(
  circleId: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(url(circleId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}
