import { useId } from "react";
import type { ComingSoonGame } from "@/games/game-room";

const NOTCH_ANGLES = [0, 60, 120, 180, 240, 300];

/** Texas Hold 'em mark — a filled poker chip with edge notches, an inner ring, and a spade cut out. */
function TexasHoldemIcon({ className }: { className?: string }) {
  // Masks need ids unique per instance; strip useId's punctuation so url(#…) resolves.
  const maskId = `${useId().replace(/[^a-zA-Z0-9_-]/g, "")}-chip`;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="24"
          height="24"
        >
          <rect width="24" height="24" fill="white" />
          {NOTCH_ANGLES.map((angle) => (
            <rect
              key={angle}
              x="10.6"
              y="0.5"
              width="2.8"
              height="3.6"
              rx="0.6"
              transform={`rotate(${angle} 12 12)`}
              fill="black"
            />
          ))}
          <circle
            cx="12"
            cy="12"
            r="6.6"
            fill="none"
            stroke="black"
            strokeWidth="1.4"
          />
          <path
            d="M12 8.5c-1.2 1.4-3.2 2.6-3.2 4.3a1.6 1.6 0 0 0 2.6 1.3l-.5 1.9h2.2l-.5-1.9a1.6 1.6 0 0 0 2.6-1.3c0-1.7-2-2.9-3.2-4.3Z"
            fill="black"
          />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="10.5" mask={`url(#${maskId})`} />
    </svg>
  );
}

export const texasHoldemGame: ComingSoonGame = {
  id: "texas-holdem",
  name: "Texas Hold ’em",
  tagline: "Poker night with your circle",
  category: "casino",
  Icon: TexasHoldemIcon,
};
