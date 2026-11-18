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
  /** Their turn. */
  active?: boolean;
  /** Pinned under the avatar, e.g. the round's net. */
  result?: ReactNode;
  /** Sitting this round out or leaving; explained in a tooltip. */
  dimmedReason?: string | null;
};

/** A seated player's avatar on the rail (name on hover). */
export function PlayerAvatar({
  occupant,
  isYou,
  active,
  result,
  dimmedReason,
}: AvatarProps) {
  const name = isYou ? "You" : occupant.displayName;

  return (
    <div className={cn("transition-opacity", dimmedReason && "opacity-50")}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={dimmedReason ? `${name}, ${dimmedReason}` : name}
            className={cn(
              "relative flex rounded-full",
              // A thin outline so avatars stand off the rail; yours is amber.
              isYou
                ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-zinc-900"
                : "ring-2 ring-white/30",
              // The chat's typing pulse and glow, on this wrapper so the outline pulses with the avatar.
              active && "animate-typing shadow-glow",
            )}
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
  children,
}: {
  dimmed?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-2 transition-opacity",
        dimmed && "opacity-50",
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
