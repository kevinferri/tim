import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { WORD_LENGTH, type LetterScore } from "../lib/rules";

// Wordle's palette: green, yellow, and a gray dark enough that used-up keys read apart from untried ones.
export const SCORE_CLASSES: Record<LetterScore, string> = {
  hit: "border-success bg-success text-white",
  near: "border-warning bg-warning text-white",
  miss: "border-muted-foreground bg-muted-foreground text-white dark:border-secondary dark:bg-secondary",
};

export const SCORE_LABELS: Record<LetterScore, string> = {
  hit: "in the right spot",
  near: "in the word, wrong spot",
  miss: "not in the word",
};

// Match the tile-flip and tile-bounce durations in tailwind.config.js.
const FLIP_MS = 500;
const FLIP_STAGGER_MS = 300;
const BOUNCE_MS = 1000;
const BOUNCE_STAGGER_MS = 100;
export const REVEAL_MS = FLIP_STAGGER_MS * (WORD_LENGTH - 1) + FLIP_MS;
export const BOUNCE_TOTAL_MS =
  BOUNCE_STAGGER_MS * (WORD_LENGTH - 1) + BOUNCE_MS;

export function Tile({
  letter,
  score,
  size = "lg",
  active,
  revealIndex,
  bounceIndex,
}: {
  letter?: string;
  score?: LetterScore;
  size?: "lg" | "sm";
  active?: boolean;
  /** Flip this tile in, `revealIndex` tiles after the first. */
  revealIndex?: number;
  bounceIndex?: number;
}) {
  const revealing = revealIndex !== undefined;
  const [flipped, setFlipped] = useState(!revealing);
  // The row's tiles are already mounted while typing, so reset when a reveal starts.
  const [wasRevealing, setWasRevealing] = useState(revealing);
  if (revealing !== wasRevealing) {
    setWasRevealing(revealing);
    setFlipped(!revealing);
  }

  useEffect(() => {
    if (!revealing) return;
    // Swap colors at the flip's midpoint, while the tile is edge-on.
    const t = setTimeout(
      () => setFlipped(true),
      revealIndex * FLIP_STAGGER_MS + FLIP_MS / 2,
    );
    return () => clearTimeout(t);
  }, [revealing, revealIndex]);

  const shown = score && (!revealing || flipped) ? score : undefined;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md font-bold uppercase",
        size === "lg"
          ? "size-12 border-2 text-2xl"
          : "size-6 rounded border text-[11px]",
        shown
          ? SCORE_CLASSES[shown]
          : letter
            ? "border-foreground/40"
            : active
              ? "border-foreground/20"
              : "border-border",
        letter && !score && size === "lg" && "motion-safe:animate-tile-pop",
        revealing && "animate-tile-flip",
        bounceIndex !== undefined && "animate-tile-bounce",
      )}
      style={
        revealing
          ? { animationDelay: `${revealIndex * FLIP_STAGGER_MS}ms` }
          : bounceIndex !== undefined
            ? { animationDelay: `${bounceIndex * BOUNCE_STAGGER_MS}ms` }
            : undefined
      }
      aria-label={
        letter && shown
          ? `${letter.toUpperCase()}, ${SCORE_LABELS[shown]}`
          : undefined
      }
    >
      {letter}
    </div>
  );
}

export function SmallGrid({
  rows,
}: {
  rows: { word: string; scores: LetterScore[] }[];
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map(({ word, scores }, i) => (
        <div key={i} className="flex gap-0.5">
          {scores.map((s, j) => (
            <Tile key={j} letter={word[j]} score={s} size="sm" />
          ))}
        </div>
      ))}
    </div>
  );
}
