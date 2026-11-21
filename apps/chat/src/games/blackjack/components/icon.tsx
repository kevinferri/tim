import { useId } from "react";

const FRONT_CARD = {
  x: 9,
  y: 5,
  width: 11,
  height: 15,
  rx: 2,
  transform: "rotate(12 14.5 12.5)",
};

/** Blackjack mark — two tilted, filled cards, a diamond cut out of the front one. */
export function BlackjackIcon({ className }: { className?: string }) {
  // Masks need ids unique per instance; strip useId's punctuation so url(#…) resolves.
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const backMask = `${id}-back`;
  const frontMask = `${id}-front`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <defs>
        {/* Cutouts instead of a background-colored outline, so it works on any surface. */}
        <mask
          id={backMask}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="24"
          height="24"
        >
          <rect width="24" height="24" fill="white" />
          <rect {...FRONT_CARD} fill="black" stroke="black" strokeWidth="2.5" />
        </mask>
        <mask
          id={frontMask}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="24"
          height="24"
        >
          <rect width="24" height="24" fill="white" />
          <path
            d="M14.5 9 17 12.5 14.5 16 12 12.5Z"
            transform={FRONT_CARD.transform}
            fill="black"
          />
        </mask>
      </defs>
      <g mask={`url(#${backMask})`}>
        <rect
          x="3"
          y="4"
          width="11"
          height="15"
          rx="2"
          transform="rotate(-14 8.5 11.5)"
        />
      </g>
      <g mask={`url(#${frontMask})`}>
        <rect {...FRONT_CARD} />
      </g>
    </svg>
  );
}
