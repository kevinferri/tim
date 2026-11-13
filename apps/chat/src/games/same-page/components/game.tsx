"use client";

import type { GameBadge, GameDefinition } from "@/games/game-room";
import { SamePageIcon } from "./same-page-icon";
import { SamePageInfoButton } from "./same-page-info";
import { SamePagePanel } from "./same-page-panel";
import { SAME_PAGE_GAME_ID } from "../lib/game-id";
import { fetchSamePage } from "./api";
import { useSamePageViewStore } from "./view-store";
import { runSamePageCommand } from "./same-page-command";
import { CommandName } from "@tim/commands";

const VIEW_LABELS = {
  play: "Play",
  results: "Results",
  standings: "Standings",
  settings: "Settings",
} as const;

function Panel({ circleId }: { circleId: string }) {
  const { view, setView } = useSamePageViewStore();
  return (
    <SamePagePanel circleId={circleId} view={view} onViewChange={setView} />
  );
}

function TitleSuffix() {
  const view = useSamePageViewStore((s) => s.view);
  return <> · {VIEW_LABELS[view]}</>;
}

async function fetchBadge(circleId: string): Promise<GameBadge> {
  const { badge } = await fetchSamePage<{ badge: GameBadge }>(
    circleId,
    "badge",
  );
  return badge;
}

export const samePageGame: GameDefinition = {
  id: SAME_PAGE_GAME_ID,
  name: "Same Page",
  tagline: "Match your circle on today’s prompt",
  category: "daily",
  Icon: SamePageIcon,
  Panel,
  TitleSuffix,
  InfoButton: SamePageInfoButton,
  fetchBadge,
  command: { name: CommandName.SamePage, run: runSamePageCommand },
};
