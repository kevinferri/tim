import { Club } from "lucide-react";
import type { ComingSoonGame } from "@/games/game-room";

function BlackjackIcon({ className }: { className?: string }) {
  return <Club strokeWidth={1.75} className={className} aria-hidden />;
}

export const blackjackGame: ComingSoonGame = {
  id: "blackjack",
  name: "Blackjack",
  tagline: "Beat the dealer to 21",
  category: "casino",
  Icon: BlackjackIcon,
};
