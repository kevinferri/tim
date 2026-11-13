import { cn } from "@/lib/utils";
import type { LetterScore } from "../lib/rules";
import { SCORE_CLASSES } from "./tiles";

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const RANK: Record<LetterScore, number> = { miss: 0, near: 1, hit: 2 };

/** Best score seen for each letter across all guesses. */
export function letterStates(rows: { word: string; scores: LetterScore[] }[]) {
  const best = new Map<string, LetterScore>();
  for (const { word, scores } of rows) {
    [...word].forEach((ch, i) => {
      const prev = best.get(ch);
      if (!prev || RANK[scores[i]] > RANK[prev]) best.set(ch, scores[i]);
    });
  }
  return best;
}

export function Keyboard({
  states,
  disabled,
  onKey,
}: {
  states: Map<string, LetterScore>;
  disabled?: boolean;
  onKey: (key: string) => void;
}) {
  const key = (k: string, label: string, wide = false) => {
    const state = states.get(k);
    return (
      <button
        key={k}
        type="button"
        disabled={disabled}
        onClick={() => onKey(k)}
        className={cn(
          "flex h-11 items-center justify-center rounded-md border text-sm font-medium uppercase transition-colors disabled:opacity-50",
          wide ? "flex-[1.5] text-xs" : "flex-1",
          state ? SCORE_CLASSES[state] : "bg-secondary hover:bg-secondary/80",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      {ROWS.map((row, i) => (
        <div key={row} className="flex gap-1">
          {i === 2 && key("enter", "Enter", true)}
          {[...row].map((ch) => key(ch, ch))}
          {i === 2 && key("backspace", "⌫", true)}
        </div>
      ))}
    </div>
  );
}
