"use client";

import { create } from "zustand";
import { useGameRoomStore } from "@/games/game-room";
import { WORDSMITH_GAME_ID } from "../lib/game-id";

export type WordsmithView = "play" | "results" | "stats" | "settings";

export const useWordsmithViewStore = create<{
  view: WordsmithView;
  setView: (view: WordsmithView) => void;
}>((set) => ({
  view: "play",
  setView: (view) => set({ view }),
}));

/** Opens Wordsmith on a given view; pass circleId when navigating to another circle. */
export function openWordsmith(view: WordsmithView = "play", circleId?: string) {
  useWordsmithViewStore.getState().setView(view);
  useGameRoomStore.getState().openGame(WORDSMITH_GAME_ID, circleId);
}
