"use client";

import { GamesSheet } from "@/components/games/games-sheet";

export function GamesSheetHost({ circleId }: { circleId: string }) {
  return <GamesSheet circleId={circleId} />;
}
