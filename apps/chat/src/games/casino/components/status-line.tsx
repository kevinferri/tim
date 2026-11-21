"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCountdown } from "../use-countdown";
import { avatarRing } from "./player-tile";

type Props = {
  children: ReactNode;
  /** Shown to the left of the text, e.g. the current player's avatar. */
  leading?: ReactNode;
  /** performance.now() deadline; shows a line that runs down to it when set. */
  deadline?: number | null;
  /** The timer's full length in ms, so the line starts full. */
  duration?: number | null;
};

/** The table's status, printed on the felt like its other markings, in a fixed spot that never moves. */
export function StatusLine({
  children,
  leading,
  deadline = null,
  duration = null,
}: Props) {
  const msLeft = useCountdown(deadline);
  const fraction =
    msLeft !== null && duration ? Math.min(1, msLeft / duration) : null;

  return (
    // Only as tall as its content, so the timer line sits STATUS_DOCK_GAP_PX above the dock like the dock's own rows.
    <div className="flex w-80 justify-center">
      {/* Keyed on the message so each new state fades in. */}
      <div
        key={typeof children === "string" ? children : undefined}
        className="flex max-w-full items-center gap-3 duration-300 animate-in fade-in"
      >
        {leading && (
          // A plain outline like every avatar's: the turn's glow stays at the seat, so only one thing pulses.
          <span className={cn("flex rounded-full", avatarRing(false))}>
            {leading}
          </span>
        )}
        {/* The timer runs under the text, as wide as it, so with the avatar it all forms one block. */}
        <div className="flex min-w-0 flex-col gap-2.5">
          <p
            // The negative margin drops the spacing after the last letter, so the line ends with the text;
            // truncates rather than running off the felt, as a backstop for anything long.
            className="-mr-[0.22em] truncate text-[15px] font-semibold leading-tight uppercase tracking-[0.22em] text-white/85 [text-shadow:0_0_6px_rgba(255,255,255,0.2)]"
            aria-live="polite"
          >
            {children}
          </p>
          {/* Always laid out, so the text doesn't shift when a timer starts or stops. */}
          <div
            aria-hidden
            className="h-0.5 w-full overflow-hidden rounded-full bg-white/10 transition-opacity duration-300"
            style={{ opacity: fraction === null ? 0 : 1 }}
          >
            <div
              className="h-full origin-center rounded-full bg-white/80 shadow-[0_0_5px_rgba(255,255,255,0.35)] transition-transform duration-100 ease-linear"
              style={{ transform: `scaleX(${fraction ?? 0})` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
