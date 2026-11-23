"use client";

import { CommandName } from "@tim/commands";
import type { GameDefinition } from "@/games/game-room";
import { BLACKJACK_GAME_ID } from "../lib/game-id";
import { BlackjackIcon } from "./icon";
import { BlackjackPanel } from "./blackjack-panel";
import { openBlackjack, useBlackjackViewStore } from "./view-store";

const VIEW_LABELS = {
  play: "Play",
  standings: "Standings",
  settings: "Settings",
} as const;

function Panel({ circleId }: { circleId: string }) {
  const { view, setView, setShown } = useBlackjackViewStore();
  return (
    <BlackjackPanel
      circleId={circleId}
      view={view}
      onViewChange={setView}
      onShownChange={setShown}
    />
  );
}

function TitleSuffix() {
  const shown = useBlackjackViewStore((s) => s.shown);
  return shown && <> · {VIEW_LABELS[shown]}</>;
}

export const blackjackGame: GameDefinition = {
  id: BLACKJACK_GAME_ID,
  name: "Blackjack",
  tagline: "Beat the dealer to 21",
  category: "casino",
  Icon: BlackjackIcon,
  Panel,
  TitleSuffix,
  command: {
    name: CommandName.Blackjack,
    run: (prompt) => {
      const token = prompt.trim().split(/\s+/)[0]?.toLowerCase();
      openBlackjack(token === "standings" ? "standings" : "play");
      return true;
    },
  },
};
