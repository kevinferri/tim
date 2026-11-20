"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { chipText } from "./chips";

/** All-time up/down as words, for screen readers and plain text; the table draws a tiny trend chart instead. */
export function formatUpDown(net: number) {
  if (net === 0) return "Even";
  return `${net > 0 ? "Up" : "Down"} ${Math.abs(net).toLocaleString()}`;
}

/** A text-weight arrow straight up (or down), like ↑ beside a price: a shaft with an open head, in the number's color. */
function TrendChart({ up }: { up: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[0.8em] w-[0.6em] shrink-0"
    >
      {/* Drawn pointing up; down is the same arrow flipped. */}
      <g transform={up ? undefined : "matrix(1 0 0 -1 0 16)"}>
        <path d="M6 15V2.5M1 7.5l5-5 5 5" />
      </g>
    </svg>
  );
}

export function UpDown({
  net: target,
  hold = false,
  onFelt,
  className,
}: {
  net: number;
  /** Keep showing the previous total (a round in play); released, it rolls to the new one. */
  hold?: boolean;
  /** On the dark felt rather than the page's theme. */
  onFelt?: boolean;
  className?: string;
}) {
  const [net, rolling] = useRolledNet(target, hold);
  const tone =
    net > 0
      ? onFelt
        ? // A soft glow on the dark felt; a drop-shadow so the arrow glows with the number.
          "text-emerald-300 [filter:drop-shadow(0_0_5px_rgba(110,231,183,0.45))]"
        : "text-emerald-600 dark:text-emerald-400"
      : net < 0
        ? onFelt
          ? "text-rose-300 [filter:drop-shadow(0_0_5px_rgba(253,164,175,0.45))]"
          : "text-rose-600 dark:text-rose-400"
        : onFelt
          ? "text-white/60"
          : "text-muted-foreground";
  return (
    <span
      aria-label={formatUpDown(net)}
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        tone,
        className,
      )}
    >
      {net !== 0 && <TrendChart up={net > 0} />}
      <span aria-hidden>
        {net === 0 ? "Even" : chipText(Math.abs(net), rolling)}
      </span>
    </span>
  );
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** `net` as shown, and whether it's mid-roll: frozen while `hold`, then rolled from the old total to the new one, easing out. */
function useRolledNet(net: number, hold: boolean): [number, boolean] {
  const [shown, setShown] = useState(net);
  const shownRef = useRef(net);
  useEffect(() => {
    if (hold) return;
    const from = shownRef.current;
    const set = (v: number) => {
      shownRef.current = v;
      setShown(v);
    };
    if (from === net || reducedMotion()) return set(net);
    const size = Math.log2(Math.max(Math.abs(net - from), 50) / 50);
    const ms = Math.min(1400, 600 + size * 160);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / ms);
      set(Math.round(from + (net - from) * (1 - (1 - t) ** 2)));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [net, hold]);
  return [shown, shown !== net && !hold];
}
