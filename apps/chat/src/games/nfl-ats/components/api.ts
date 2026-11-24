// Client calls and cache keys for the NFL ATS API route.
import type { PickResult, PickSide } from "../lib/grade";

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

const url = (circleId: string, badge?: boolean) =>
  `/api/circles/${circleId}/nfl-ats${badge ? "?view=badge" : ""}`;

export const nflAtsQueryKey = (circleId: string) => ["nfl-ats", circleId];

export async function fetchNflAts<T = NflAtsState>(
  circleId: string,
  badge?: boolean,
) {
  const res = await fetch(url(circleId, badge));
  if (!res.ok) throw new Error("Couldn’t load Pick ’em");
  return (await res.json()) as T;
}

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
