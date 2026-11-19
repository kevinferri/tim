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
  /** In your seat's gold, e.g. on your turn. */
  highlight?: boolean;
};

/** The table's status, printed on the felt like its other markings, in a fixed spot that never moves. */
export function StatusLine({
  children,
  leading,
  deadline = null,
  duration = null,
  highlight = false,
}: Props) {
  const msLeft = useCountdown(deadline);
  const fraction =
    msLeft !== null && duration ? Math.min(1, msLeft / duration) : null;

  return (
    <div className="flex h-14 w-80 flex-col items-center justify-center gap-2.5">
      {/* Keyed on the message so each new state fades in. */}
      <div
        key={typeof children === "string" ? children : undefined}
        className="flex max-w-full items-center gap-3 duration-300 animate-in fade-in"
      >
        {leading && (
          // The same turn glow as at the seat.
          <span className={cn("flex rounded-full", avatarRing(true))}>
            {leading}
          </span>
        )}
        <p
          className={cn(
            // Truncates rather than running off the felt, as a backstop for anything long.
            "min-w-0 truncate text-[15px] font-semibold uppercase tracking-[0.22em]",
            highlight
              ? "text-amber-300 [text-shadow:0_0_6px_rgba(252,211,77,0.4)]"
              : "text-white/85 [text-shadow:0_0_6px_rgba(255,255,255,0.2)]",
          )}
          aria-live="polite"
        >
          {children}
        </p>
      </div>
      {/* Always laid out, so the text doesn't shift when a timer starts or stops. */}
      <div
        aria-hidden
        className="h-0.5 w-40 overflow-hidden rounded-full bg-white/10 transition-opacity duration-300"
        style={{ opacity: fraction === null ? 0 : 1 }}
      >
        <div
          className={cn(
            "h-full origin-center rounded-full transition-transform duration-100 ease-linear",
            highlight
              ? "bg-amber-300 shadow-[0_0_5px_rgba(252,211,77,0.4)]"
              : "bg-white/80 shadow-[0_0_5px_rgba(255,255,255,0.35)]",
          )}
          style={{ transform: `scaleX(${fraction ?? 0})` }}
        />
      </div>
    </div>
  );
}
