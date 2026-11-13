"use client";

import {
  getNextEasternMidnight,
  type GameBadge,
  type GameDefinition,
} from "@/games/game-room";
import { WORDSMITH_GAME_ID } from "../lib/game-id";
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
  // Every midnight, weekends too: an unfinished Friday's dot has to clear on Saturday.
  nextBadgeChangeAt: () => getNextEasternMidnight(),
  command: { name: CommandName.Wordsmith, run: runWordsmithCommand },
};
