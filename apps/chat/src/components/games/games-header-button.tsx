"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGamesUiStore } from "@/components/games/games-ui-store";
import type { GamesBadge } from "@/lib/same-page/same-page-model";

type Props = {
  circleId: string;
};

function GamesGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <path d="M6 12h4M8 10v4" />
      <circle cx="16.5" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

async function fetchBadge(circleId: string): Promise<GamesBadge> {
  const res = await fetch(`/api/circles/${circleId}/same-page?view=badge`);
  if (!res.ok) return null;
  const data = (await res.json()) as { badge: GamesBadge };
  return data.badge;
}

export function GamesHeaderButton({ circleId }: Props) {
  const openHub = useGamesUiStore((s) => s.openHub);
  const { data: badge = null } = useQuery({
    queryKey: ["games-badge", circleId],
    queryFn: () => fetchBadge(circleId),
    refetchInterval: 60_000,
  });

  return (
    <Button
      variant="ghost"
      size="iconSm"
      className="relative"
      aria-label="Game Room"
      onClick={() => openHub()}
    >
      <GamesGlyph className="h-4 w-4" />
      {badge && (
        <span
          className={cn(
            "absolute right-0.5 top-0.5 h-2 w-2 rounded-full ring-2 ring-background",
            badge === "play" && "bg-orange-500",
            badge === "results" && "bg-violet-500",
          )}
          aria-hidden
        />
      )}
    </Button>
  );
}
