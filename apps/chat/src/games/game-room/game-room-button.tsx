"use client";

import { Tooltip, TooltipProvider } from "@radix-ui/react-tooltip";
import { Button } from "@/components/ui/button";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BadgeDot, combineBadges, useGameBadges } from "./badges";
import { useUnseenBadges } from "./room-seen";
import { useGameRoomStore } from "./store";
import type { GameDefinition } from "./types";

type Props = {
  circleId: string;
  games: GameDefinition[];
  /** Matches the circle sidebar's minimized (icon-only) mode. */
  isMinimized: boolean;
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

/** Circle sidebar entry point to the Game room, styled like its other circle actions. */
export function GameRoomButton({ circleId, games, isMinimized }: Props) {
  const openHub = useGameRoomStore((s) => s.openHub);
  // Once you've opened the room today, only badges that appeared since then light the button.
  const badge = combineBadges(
    useUnseenBadges(circleId, useGameBadges(circleId, games)),
  );

  if (isMinimized) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="relative rounded-full"
              aria-label="Game room"
              onClick={() => openHub()}
            >
              <GamesGlyph className="h-4 w-4" />
              <BadgeDot badge={badge} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Game room</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="ghost"
      className="flex w-full gap-3"
      onClick={() => openHub()}
    >
      <span>Game room</span>
      <span className="relative">
        <GamesGlyph className="h-4 w-4" />
        <BadgeDot badge={badge} className="-right-1 -top-1" />
      </span>
    </Button>
  );
}
