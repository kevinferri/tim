"use client";

import type { GameBadge, GameDefinition } from "@/games/game-room";
import { NFL_ATS_GAME_ID } from "../lib/game-id";
import { fetchNflAts } from "./api";
import { NflAtsIcon } from "./nfl-ats-icon";
import { NflAtsPanel } from "./nfl-ats-panel";
import { useNflAtsViewStore } from "./view-store";

const VIEW_LABELS = {
  picks: "Picks",
  standings: "Standings",
  settings: "Settings",
} as const;

function Panel({ circleId }: { circleId: string }) {
  const { view, setView } = useNflAtsViewStore();
  return <NflAtsPanel circleId={circleId} view={view} onViewChange={setView} />;
}

function TitleSuffix() {
  const view = useNflAtsViewStore((s) => s.view);
  return <> · {VIEW_LABELS[view]}</>;
}

// The next kickoff, learned from the last badge fetch. nextBadgeChangeAt is
// synchronous and takes no circle, and the Game room re-arms its timer after
// every fetch, so stashing it here is what lets the dot clear on a kickoff
// rather than waiting out the day.
let nextKickoffAt: number | null = null;

async function fetchBadge(circleId: string): Promise<GameBadge> {
  const { badge, nextChangeAt } = await fetchNflAts<{
    badge: GameBadge;
    nextChangeAt: string | null;
  }>(circleId, "badge");
  nextKickoffAt = nextChangeAt ? new Date(nextChangeAt).getTime() : null;
  return badge;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function nextBadgeChangeAt(): Date {
  // No kickoff ahead of us (mid-week, or before the first slate): check back
  // periodically so a newly published slate lights the dot without a reload.
  return new Date(nextKickoffAt ?? Date.now() + SIX_HOURS_MS);
}

export const nflAtsGame: GameDefinition = {
  id: NFL_ATS_GAME_ID,
  name: "Pick ’em",
  tagline: "Take the NFL slate against the spread",
  category: "weekly",
  Icon: NflAtsIcon,
  Panel,
  TitleSuffix,
  fetchBadge,
  nextBadgeChangeAt,
};
