"use client";

import type { GameBadge, GameDefinition } from "@/games/game-room";
import { WORDSMITH_GAME_ID } from "../lib/game-id";
import { getNextGameDayAt } from "../lib/day";
import { fetchWordsmith } from "./api";
import { WordsmithIcon } from "./wordsmith-icon";
import { WordsmithInfoButton } from "./wordsmith-info";
import { WordsmithPanel } from "./wordsmith-panel";
import { useWordsmithViewStore } from "./view-store";
import { runWordsmithCommand } from "./wordsmith-command";
import { CommandName } from "@tim/commands";

const VIEW_LABELS = {
  play: "Play",
  results: "Results",
  stats: "Stats",
  settings: "Settings",
} as const;

function Panel({ circleId }: { circleId: string }) {
  const { view, setView } = useWordsmithViewStore();
  return (
    <WordsmithPanel circleId={circleId} view={view} onViewChange={setView} />
  );
}

function TitleSuffix() {
  const view = useWordsmithViewStore((s) => s.view);
  return <> · {VIEW_LABELS[view]}</>;
}

async function fetchBadge(circleId: string): Promise<GameBadge> {
  const { badge } = await fetchWordsmith<{ badge: GameBadge }>(circleId, true);
  return badge;
}

export const wordsmithGame: GameDefinition = {
  id: WORDSMITH_GAME_ID,
  name: "Wordsmith",
  tagline: "Crack today’s five-letter word",
  Icon: WordsmithIcon,
  Panel,
  TitleSuffix,
  InfoButton: WordsmithInfoButton,
  fetchBadge,
  nextBadgeChangeAt: () => getNextGameDayAt(),
  command: { name: CommandName.Wordsmith, run: runWordsmithCommand },
};
