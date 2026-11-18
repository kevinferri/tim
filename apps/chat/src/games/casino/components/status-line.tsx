"use client";

import type { ReactNode } from "react";
import { useCountdown } from "../use-countdown";

type Props = {
  children: ReactNode;
  /** A smaller second line, e.g. the current hand's total. */
  detail?: ReactNode;
  /** Shown to the left of the text, e.g. the current player's avatar. */
  leading?: ReactNode;
  /** The viewer's controls when it's their move, under the countdown. */
  actions?: ReactNode;
  /** performance.now() deadline; shows the seconds left when set. The bar lives with the viewer's controls (`MoveTimer`). */
  deadline?: number | null;
};

/**
 * The table's status area: a fixed spot marked on the felt, like the bet circles. Only its
 * contents change with the game; it never moves or resizes.
 */
export function StatusLine({
  children,
  detail,
  leading,
  actions,
  deadline = null,
}: Props) {
  const msLeft = useCountdown(deadline);
  const showTimer = msLeft !== null;

  return (
    <div className="flex h-14 w-72 flex-col items-center justify-center rounded-2xl bg-black/25 px-5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
      {/* Keyed on the message so each new state fades in. */}
      <div
        key={typeof children === "string" ? children : undefined}
        className="flex items-center gap-3 duration-300 animate-in fade-in"
      >
        {leading}
        <div className="flex flex-col items-center gap-1">
          <p className="text-base font-medium" aria-live="polite">
            {children}
            {showTimer && (
              <span className="ml-2 font-medium tabular-nums text-emerald-50/70">
                {Math.ceil(msLeft / 1000)}s
              </span>
            )}
          </p>
          {detail && <p className="text-sm text-emerald-50/80">{detail}</p>}
        </div>
      </div>
      {actions && (
        <div className="mt-1 flex flex-col items-center gap-3 animate-in fade-in duration-200">
          {actions}
        </div>
      )}
    </div>
  );
}
