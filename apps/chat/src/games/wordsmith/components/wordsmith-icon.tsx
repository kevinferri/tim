import { cn } from "@/lib/utils";

const COLS = [1, 9.25, 17.5];
const ROWS = [5.125, 13.375];
// [row, col] of filled tiles: one on the first guess, two on the second.
const FILLED = new Set(["0,1", "1,1", "1,2"]);

/** Wordsmith mark — two rows of letter tiles filling in. */
export function WordsmithIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      // Thinner than Same Page's 1.75 so the small tiles keep visible gaps and open centers.
      strokeWidth="1.5"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {ROWS.map((y, r) =>
        COLS.map((x, c) => (
          <rect
            key={`${r},${c}`}
            x={x}
            y={y}
            width="5.5"
            height="5.5"
            rx="1.25"
            fill={FILLED.has(`${r},${c}`) ? "currentColor" : undefined}
          />
        )),
      )}
    </svg>
  );
}
