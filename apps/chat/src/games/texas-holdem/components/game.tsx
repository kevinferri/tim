import type { ComingSoonGame } from "@/games/game-room";

/** Texas Hold 'em mark — a short stack of poker chips. */
function TexasHoldemIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <ellipse cx="12" cy="7" rx="8" ry="3" />
      <path d="M4 7v4c0 1.66 3.58 3 8 3s8-1.34 8-3V7" />
      <path d="M4 11v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4" />
      <path d="M8 9.7v4M16 9.7v4M8 13.7v4M16 13.7v4" opacity="0.55" />
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
