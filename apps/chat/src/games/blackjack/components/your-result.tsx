"use client";

import { useEffect, useState } from "react";
import { playTallyKnock } from "@/games/casino";
import { cn } from "@/lib/utils";

/** The longest count-up, capped to finish inside RESULTS_MS. */
export const TALLY_MAX_MS = 1800;

const tally = (amount: number) => {
  const size = Math.log2(Math.max(amount, 10) / 10); // 0 at 10 chips, about 6.6 at 1,000
  return {
    ms: Math.min(TALLY_MAX_MS, 700 + size * 170),
    knocks: Math.min(28, amount, Math.round(8 + size * 3)),
  };
};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts from 0 to `to`, easing out, from when it mounts, knocking on even steps of the way. */
function useCountUp(to: number, still: boolean) {
  const [value, setValue] = useState(() => (still || reducedMotion() ? to : 0));
  useEffect(() => {
    if (still || reducedMotion() || to <= 0) return;
    const { ms, knocks } = tally(to);
    let knocked = 0;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / ms);
      // A gentle ease for the number; the knocks keep an even beat, so there's no lull before the end.
      setValue(Math.round(to * (1 - (1 - t) ** 2)));
      // A knock for each beat passed (at most one per frame), the last at the top.
      const step = t >= 1 ? knocks : Math.floor(t * knocks);
      if (step > knocked) {
        knocked = step;
        playTallyKnock(step - 1, knocks);
      }
      if (t < 1 || knocked < knocks) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [to, still]);
  // Turning still mid-count cancels it, so jump to the end.
  return still ? to : value;
}

/** Your own result in the status area: a win counts up in gold, a loss is quieter, a push is calm. */
export function YourResult({
  net,
  blackjack,
  still = false,
  cause,
}: {
  net: number;
  blackjack: boolean;
  /** Already counted up (a natural paid during play): shows the amount as is. */
  still?: boolean;
  /** Names why you lost or pushed in place of "You lost"/"Bet returned", e.g. "Dealer blackjack". */
  cause?: string;
}) {
  const shown = useCountUp(Math.max(net, 0), still);
  const win = net > 0;
  const label = win
    ? blackjack
      ? "Blackjack!"
      : "You won"
    : (cause ?? (net < 0 ? "You lost" : "Bet returned"));

  return (
    <div
      className="flex h-14 w-80 flex-col items-center justify-center"
      aria-live="polite"
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.22em] duration-300 animate-in fade-in",
          win ? "text-amber-300" : "text-white/60",
        )}
      >
        {label}
      </p>
      {win ? (
        <p
          className={cn(
            !still && "animate-result-pop",
            "text-4xl font-semibold leading-none tabular-nums",
            "text-amber-300 [text-shadow:0_0_14px_rgba(252,211,77,0.55)]",
          )}
        >
          +{shown.toLocaleString()}
        </p>
      ) : (
        <p
          className={cn(
            "text-2xl font-medium leading-tight tabular-nums duration-500 animate-in fade-in",
            net < 0
              ? "text-rose-300"
              : "uppercase tracking-[0.22em] text-white/85",
          )}
        >
          {net < 0 ? `−${(-net).toLocaleString()}` : "Push"}
        </p>
      )}
    </div>
  );
}
