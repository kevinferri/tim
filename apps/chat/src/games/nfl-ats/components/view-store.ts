"use client";

import { create } from "zustand";
import { useGameRoomStore } from "@/games/game-room";
import { NFL_ATS_GAME_ID } from "../lib/game-id";

export type NflAtsView = "picks" | "standings" | "settings";

export const useNflAtsViewStore = create<{
  view: NflAtsView;
  setView: (view: NflAtsView) => void;
}>((set) => ({
  view: "picks",
  setView: (view) => set({ view }),
}));

/** Opens Pick 'em on a given view; pass circleId when navigating to another circle. */
export function openNflAts(view: NflAtsView = "picks", circleId?: string) {
  useNflAtsViewStore.getState().setView(view);
  useGameRoomStore.getState().openGame(NFL_ATS_GAME_ID, circleId);
}
