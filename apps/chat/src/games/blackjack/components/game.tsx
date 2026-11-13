import type { ComingSoonGame } from "@/games/game-room";

/** Blackjack mark — two cards, the front one an ace of spades. */
function BlackjackIcon({ className }: { className?: string }) {
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
      {/* Back card: only the edges the front card doesn't cover. */}
      <path d="M9 18H4.5A1.5 1.5 0 0 1 3 16.5v-12A1.5 1.5 0 0 1 4.5 3h8A1.5 1.5 0 0 1 14 4.5V6" />
      <rect x="9" y="6" width="11" height="15" rx="1.5" />
      <path d="M10.9 12l1.1-3 1.1 3M11.3 11h1.4" strokeWidth="1.25" />
      <path d="M15.5 13c-1.2 1.1-2 1.8-2 2.8a1.1 1.1 0 0 0 2 .5 1.1 1.1 0 0 0 2-.5c0-1-.8-1.7-2-2.8Z" />
      <path d="M15.5 16.3v1.5" />
    </svg>
  );
}

export const blackjackGame: ComingSoonGame = {
  id: "blackjack",
  name: "Blackjack",
  tagline: "Beat the dealer to 21",
  category: "casino",
  Icon: BlackjackIcon,
};
