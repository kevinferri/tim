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
  /** Their turn: the ring brightens. */
  active?: boolean;
  /** Pinned under the avatar, e.g. the round's net. */
  result?: ReactNode;
  /** Sitting this round out or leaving; explained in a tooltip. */
  dimmedReason?: string | null;
  /** Still in the round but someone else is playing: dimmed less than sitting out. */
  waiting?: boolean;
};

/** A thin outline so avatars stand off the rail, the same on every avatar; brighter on their turn. */
export const avatarRing = (active?: boolean) =>
  cn(
    "ring-[1.5px] transition-shadow duration-300",
    active ? "ring-white/85" : "ring-white/30",
  );

/** A seated player's avatar on the rail (name on hover). */
export function PlayerAvatar({
  occupant,
  isYou,
  active,
  result,
  dimmedReason,
  waiting,
}: AvatarProps) {
  const name = isYou ? "You" : occupant.displayName;

  return (
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
            {/* On the bottom edge; your round result takes its place while it shows. */}
            {isYou && !result && (
              <span className="absolute inset-x-0 -bottom-2.5 flex justify-center">
                <span className="rounded-full bg-amber-300 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-950 shadow">
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
