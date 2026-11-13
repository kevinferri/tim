"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { gameRoomBadgeQueryKey } from "./store";
import type { GameBadge, GameDefinition } from "./types";

export function BadgeDot({
  badge,
  className = "right-0.5 top-0.5",
}: {
  badge: GameBadge;
  className?: string;
}) {
  if (!badge) return null;
  return (
    <span
      className={cn(
        "absolute h-2 w-2 rounded-full bg-purple-500 ring-2 ring-background",
        className,
      )}
      aria-hidden
    />
  );
}

// Spreads open tabs' refetches out after a shared rollover time.
const BADGE_REFRESH_JITTER_MS = 30_000;

/** Each game's badge for a circle, keyed by game id. One query shared by the sidebar button and the sheet. */
export function useGameBadges(circleId: string, games: GameDefinition[]) {
  const queryClient = useQueryClient();
  const { data = {}, dataUpdatedAt } = useQuery({
    queryKey: gameRoomBadgeQueryKey(circleId),
    queryFn: async (): Promise<Record<string, GameBadge>> =>
      Object.fromEntries(
        await Promise.all(
          games.map(async (g) => [
            g.id,
            (await g.fetchBadge?.(circleId).catch(() => null)) ?? null,
          ]),
        ),
      ),
    // No polling: games invalidate this key when their badge may change, or schedule it via nextBadgeChangeAt.
  });

  // Re-armed after every fetch, so it always targets the next change.
  useEffect(() => {
    const times = games
      .map((g) => g.nextBadgeChangeAt?.().getTime())
      .filter((t): t is number => t !== undefined);
    if (times.length === 0) return;
    const delay =
      Math.min(...times) - Date.now() + BADGE_REFRESH_JITTER_MS * Math.random();
    const timer = setTimeout(
      () =>
        queryClient.invalidateQueries({
          queryKey: gameRoomBadgeQueryKey(circleId),
        }),
      Math.max(delay, 0),
    );
    return () => clearTimeout(timer);
  }, [circleId, games, dataUpdatedAt, queryClient]);

  return data;
}

/** One badge for the whole room: "play" (something to do) outranks "results". */
export function combineBadges(badges: Record<string, GameBadge>): GameBadge {
  const values = Object.values(badges);
  if (values.includes("play")) return "play";
  if (values.includes("results")) return "results";
  return null;
}
