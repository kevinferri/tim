"use client";

import type { ReactNode } from "react";
import { useCountdown } from "../use-countdown";

type Props = {
  children: ReactNode;
  /** Shown to the left of the text, e.g. the current player's avatar. */
  leading?: ReactNode;
  /** performance.now() deadline; shows the seconds left when set. */
  deadline?: number | null;
};

/** The table's status area: a fixed spot on the felt that never moves or resizes. */
export function StatusLine({ children, leading, deadline = null }: Props) {
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
        <p className="text-base font-medium" aria-live="polite">
          {children}
          {showTimer && (
            <span className="ml-2 font-medium tabular-nums text-emerald-50/70">
              {Math.ceil(msLeft / 1000)}s
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
