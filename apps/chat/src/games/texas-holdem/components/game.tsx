import type { ComingSoonGame } from "@/games/game-room";

/** Texas Hold 'em mark — a poker chip with six edge stripes. */
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
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2.5v3M12 18.5v3M3.77 7.25l2.6 1.5M17.63 15.25l2.6 1.5M3.77 16.75l2.6-1.5M17.63 8.75l2.6-1.5" />
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
