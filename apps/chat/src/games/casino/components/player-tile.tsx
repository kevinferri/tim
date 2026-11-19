"use client";

import type { ReactNode } from "react";
import type { SeatOccupant } from "@tim/casino";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

type AvatarProps = {
  occupant: SeatOccupant;
  isYou?: boolean;
  /** Their turn: a pulsing purple glow replaces the white ring. */
  active?: boolean;
  /** Pinned under the avatar, e.g. the round's net. */
  result?: ReactNode;
  /** Sitting this round out or leaving; explained in a tooltip. */
  dimmedReason?: string | null;
  /** Still in the round but someone else is playing: dimmed less than sitting out. */
  waiting?: boolean;
  /** A brief speech bubble rising from the avatar, e.g. what they just did. Keyed by the caller so each one pops in. */
  bubble?: ReactNode;
};

/** A thin outline so avatars stand off the rail; whoever's turn it is gets the pulsing purple glow. */
export const avatarRing = (active?: boolean) =>
  active
    ? "animate-turn-pulse ring-[1.5px] ring-purple-600 shadow-[0_0_4px_#9333ea,0_0_10px_#9333ea]"
    : "ring-[1.5px] ring-white/30 transition-shadow";

/** A seated player's avatar on the rail (name on hover). */
export function PlayerAvatar({
  occupant,
  isYou,
  active,
  result,
  dimmedReason,
  waiting,
  bubble,
}: AvatarProps) {
  const name = isYou ? "You" : occupant.displayName;

  return (
    <div className="relative">
      {/* Rising from the avatar, over their own cards; outside the dimmed avatar, so it stays bright
          after they've acted and someone else is up. */}
      {bubble && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2">
          {bubble}
        </div>
      )}
      <div
        className={cn(
          "transition-opacity",
          dimmedReason ? "opacity-50" : waiting && "opacity-75",
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-label={dimmedReason ? `${name}, ${dimmedReason}` : name}
              className={cn("relative flex rounded-full", avatarRing(active))}
            >
              <OccupantAvatar occupant={occupant} size="2xl" />
              {/* Straddling the bottom edge, mostly inside the circle; your round result takes its place while it shows.
                Purple-600 to match the turn pulse it sits next to. */}
              {isYou && !result && (
                <span className="absolute inset-x-0 -bottom-[5px] flex justify-center">
                  <span className="rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-slate-100 shadow">
                    You
                  </span>
                </span>
              )}
              {/* Pinned to the avatar's bottom edge without taking space, so the seat doesn't move when it appears. */}
              {result && (
                <span className="absolute inset-x-0 -bottom-2.5 flex justify-center">
                  <span className="whitespace-nowrap rounded-full bg-black/85 px-2 py-0.5 shadow ring-1 ring-white/15 animate-in fade-in zoom-in-75 duration-300">
                    {result}
                  </span>
                </span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {occupant.displayName}
            {dimmedReason && (
              <span className="text-muted-foreground"> · {dimmedReason}</span>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/** A seated player's spot on the felt: bet and cards. */
export function PlayerSpot({
  dimmed,
  waiting,
  children,
}: {
  dimmed?: boolean;
  /** See PlayerAvatar's `waiting`. */
  waiting?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-2 transition-opacity",
        dimmed ? "opacity-50" : waiting && "opacity-75",
      )}
    >
      {children}
    </div>
  );
}

export function OccupantAvatar({
  occupant,
  size,
  typing,
}: {
  occupant: SeatOccupant;
  size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  typing?: boolean;
}) {
  return (
    <UserAvatar
      id={occupant.userId}
      name={occupant.name}
      displayName={occupant.displayName}
      imageUrl={occupant.imageUrl}
      createdAt={new Date(occupant.createdAt)}
      status={null}
      lastStatusUpdate={null}
      showStatus={false}
      disableSheet
      size={size}
      variant={typing ? "typing" : "default"}
    />
  );
}
