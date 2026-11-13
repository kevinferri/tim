import { cn } from "@/lib/utils";
import type { LetterScore } from "../lib/rules";

// Hit is filled, near is outlined, so the two read apart without relying on color alone.
export const SCORE_CLASSES: Record<LetterScore, string> = {
  hit: "border-purple-500 bg-purple-500 text-white",
  near: "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-2",
  miss: "border-transparent bg-muted text-muted-foreground",
};

export const SCORE_LABELS: Record<LetterScore, string> = {
  hit: "in the right spot",
  near: "in the word, wrong spot",
  miss: "not in the word",
};

export function Tile({
  letter,
  score,
  size = "lg",
  active,
}: {
  letter?: string;
  score?: LetterScore;
  size?: "lg" | "sm";
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border font-semibold uppercase",
        size === "lg" ? "size-12 text-xl" : "size-6 rounded text-[11px]",
        score
          ? SCORE_CLASSES[score]
          : letter
            ? "border-foreground/40"
            : active
              ? "border-foreground/20"
              : "border-border",
      )}
      aria-label={
        letter && score
          ? `${letter.toUpperCase()}, ${SCORE_LABELS[score]}`
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
