"use client";

import type { GameBadge, GameDefinition } from "@/games/game-room";
import { SPELL_IT_OUT_GAME_ID } from "../lib/game-id";
import { getNextGameDayAt } from "../lib/day";
import { fetchSpellItOut } from "./api";
import { SpellItOutIcon } from "./spell-it-out-icon";
import { SpellItOutInfoButton } from "./spell-it-out-info";
import { SpellItOutPanel } from "./spell-it-out-panel";
import { useSpellItOutViewStore } from "./view-store";
import { runSpellItOutCommand } from "./spell-it-out-command";
import { CommandName } from "@tim/commands";

const VIEW_LABELS = {
  play: "Play",
  results: "Results",
  stats: "Stats",
  settings: "Settings",
} as const;

function Panel({ circleId }: { circleId: string }) {
  const { view, setView } = useSpellItOutViewStore();
  return (
    <SpellItOutPanel circleId={circleId} view={view} onViewChange={setView} />
  );
}

function TitleSuffix() {
  const view = useSpellItOutViewStore((s) => s.view);
  return <> · {VIEW_LABELS[view]}</>;
}

async function fetchBadge(circleId: string): Promise<GameBadge> {
  const { badge } = await fetchSpellItOut<{ badge: GameBadge }>(circleId, true);
  return badge;
}

export const spellItOutGame: GameDefinition = {
  id: SPELL_IT_OUT_GAME_ID,
  name: "Spell It Out",
  tagline: "Crack today’s five-letter word",
  Icon: SpellItOutIcon,
  Panel,
  TitleSuffix,
  InfoButton: SpellItOutInfoButton,
  fetchBadge,
  nextBadgeChangeAt: () => getNextGameDayAt(),
  command: { name: CommandName.SpellItOut, run: runSpellItOutCommand },
};
