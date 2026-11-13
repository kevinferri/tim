// Client calls and cache keys for the Same Page API route.

type View = "badge" | "standings";

const url = (circleId: string, view?: View) =>
  `/api/circles/${circleId}/same-page${view ? `?view=${view}` : ""}`;

/** Prefix match: invalidating ["same-page", circleId] also refreshes standings. */
export const samePageQueryKey = (circleId?: string) =>
  circleId ? ["same-page", circleId] : ["same-page"];

export const samePageStandingsQueryKey = (circleId: string) => [
  ...samePageQueryKey(circleId),
  "standings",
];

export async function fetchSamePage<T>(circleId: string, view?: View) {
  const res = await fetch(url(circleId, view));
  if (!res.ok) throw new Error("Couldn’t load Same Page");
  return (await res.json()) as T;
}

/** Throws the route's own error message (e.g. a validation error) when present. */
export async function postSamePage<T = unknown>(
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
