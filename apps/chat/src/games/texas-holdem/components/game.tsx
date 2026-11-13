import { Spade } from "lucide-react";
import type { ComingSoonGame } from "@/games/game-room";

function TexasHoldemIcon({ className }: { className?: string }) {
  return <Spade strokeWidth={1.75} className={className} aria-hidden />;
}

export const texasHoldemGame: ComingSoonGame = {
  id: "texas-holdem",
  name: "Texas Hold ’em",
  tagline: "Poker night with your circle",
  category: "casino",
  Icon: TexasHoldemIcon,
};
