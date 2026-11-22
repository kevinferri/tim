"use client";

import { Tooltip, TooltipProvider } from "@radix-ui/react-tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HEADER_CIRCLE_SIZE, NAV_ICON_CIRCLE } from "@/lib/nav-icon";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BadgeDot, combineBadges, useGameBadges } from "./badges";
import { useUnseenBadges } from "./room-seen";
import { useGameRoomStore } from "./store";
import type { GameDefinition } from "./types";

type Props = {
  circleId: string;
  games: GameDefinition[];
  /** "header": the circle name row. "rail": the minimized sidebar. */
  placement: "header" | "rail";
  className?: string;
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
      {/* 18×13 of the 24 grid, balanced against the News page. */}
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="M6.5 12h4M8.5 10v4" />
      <circle cx="15.5" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Circle sidebar entry point to the Game room. */
export function GameRoomButton({
  circleId,
  games,
  placement,
  className,
}: Props) {
  const inHeader = placement === "header";
  const openHub = useGameRoomStore((s) => s.openHub);
  // Once you've opened the room today, only badges that appeared since then light the button.
  const badge = combineBadges(
    useUnseenBadges(circleId, useGameBadges(circleId, games)),
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant={inHeader ? "ghost" : "secondary"}
            size="icon"
            className={cn(
              "relative rounded-full",
              inHeader &&
                cn(
                  "group hover:bg-transparent active:scale-100",
                  HEADER_CIRCLE_SIZE,
                ),
              className,
            )}
            aria-label="Game room"
            onClick={() => openHub()}
          >
            {/* The dot rides on the icon, so it stays put however wide the button is. */}
            <span className={cn(inHeader && NAV_ICON_CIRCLE)}>
              <span className="relative">
                <GamesGlyph className="h-4 w-4" />
                <BadgeDot badge={badge} className="-right-1 -top-1" />
              </span>
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side={inHeader ? "bottom" : "right"}>
          Game room
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
