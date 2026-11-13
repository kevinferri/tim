"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gameRoomBadgeQueryKey } from "./store";
import type { GameBadge } from "./types";

// Under the badge key, so anything that refreshes badges (e.g. at midnight) refreshes this too.
const seenQueryKey = (circleId: string) => [
  ...gameRoomBadgeQueryKey(circleId),
  "seen",
];

const url = (circleId: string) => `/api/circles/${circleId}/game-room`;

const badgeKeys = (badges: Record<string, GameBadge>) =>
  Object.entries(badges)
    .filter(([, badge]) => badge)
    .map(([gameId, badge]) => `${gameId}:${badge}`);

function useSeenBadgeKeys(circleId: string) {
  return useQuery({
    queryKey: seenQueryKey(circleId),
    queryFn: async (): Promise<string[]> => {
      const res = await fetch(url(circleId));
      if (!res.ok) throw new Error("Couldn’t load Game room");
      return ((await res.json()) as { badgeKeys: string[] }).badgeKeys;
    },
  });
}

/** Badges that appeared since you last opened the Game room today (e.g. Same Page's 4pm results). */
export function useUnseenBadges(
  circleId: string,
  badges: Record<string, GameBadge>,
): Record<string, GameBadge> {
  const { data: seen } = useSeenBadgeKeys(circleId);
  // Until we know what you've seen, stay quiet rather than flash a dot.
  if (!seen) return {};
  const seenSet = new Set(seen);
  return Object.fromEntries(
    Object.entries(badges).map(([gameId, badge]) => [
      gameId,
      badge && seenSet.has(`${gameId}:${badge}`) ? null : badge,
    ]),
  );
}

/** While the Game room is open, everything it's showing counts as seen for today. */
export function useMarkRoomSeen(
  circleId: string,
  open: boolean,
  badges: Record<string, GameBadge>,
) {
  const queryClient = useQueryClient();
  const { data: seen } = useSeenBadgeKeys(circleId);
  const mark = useMutation({
    mutationFn: async (keys: string[]): Promise<string[]> => {
      const res = await fetch(url(circleId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeKeys: keys }),
      });
      if (!res.ok) throw new Error("Couldn’t update Game room");
      return ((await res.json()) as { badgeKeys: string[] }).badgeKeys;
    },
    onMutate: (keys) => {
      // Clear the button's dot right away.
      queryClient.setQueryData<string[]>(seenQueryKey(circleId), (prev) => [
        ...new Set([...(prev ?? []), ...keys]),
      ]);
    },
    onSuccess: (keys) => queryClient.setQueryData(seenQueryKey(circleId), keys),
    onError: () =>
      queryClient.invalidateQueries({ queryKey: seenQueryKey(circleId) }),
  });

  const unseen = seen ? badgeKeys(badges).filter((k) => !seen.includes(k)) : [];
  const unseenKey = unseen.join(",");

  useEffect(() => {
    if (open && unseen.length > 0) mark.mutate(unseen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, circleId, unseenKey]);
}
