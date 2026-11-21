// Client calls and cache keys for the Blackjack API route.

const url = (circleId: string, view?: "standings") =>
  `/api/circles/${circleId}/blackjack${view ? `?view=${view}` : ""}`;

/** Prefix match: invalidating ["blackjack", circleId] also refreshes standings. */
export const blackjackQueryKey = (circleId: string) => ["blackjack", circleId];

export const blackjackStandingsQueryKey = (circleId: string) => [
  ...blackjackQueryKey(circleId),
  "standings",
];

export type BlackjackState = { enabled: boolean; isAdmin: boolean };

export type UpDownStanding = {
  user: {
    id: string;
    displayName: string;
    name: string | null;
    imageUrl: string | null;
  };
  net: number;
  wagered: number;
  handsPlayed: number;
};

async function get<T>(circleId: string, view?: "standings") {
  const res = await fetch(url(circleId, view));
  if (!res.ok) throw new Error("Couldn’t load Blackjack");
  return (await res.json()) as T;
}

export const fetchBlackjack = (circleId: string) =>
  get<BlackjackState>(circleId);

export const fetchStandings = (circleId: string) =>
  get<{ standings: UpDownStanding[] }>(circleId, "standings").then(
    (d) => d.standings,
  );

export async function setBlackjackEnabled(circleId: string, enabled: boolean) {
  const res = await fetch(url(circleId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: enabled ? "enable" : "disable" }),
  });
  if (!res.ok) throw new Error("Couldn’t update Blackjack");
}
