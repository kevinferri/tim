"use client";

import { create } from "zustand";
import { useGameRoomStore } from "@/games/game-room";
import { SAME_PAGE_GAME_ID } from "../lib/game-id";

export type SamePageView = "play" | "results" | "standings" | "settings";

export const useSamePageViewStore = create<{
  view: SamePageView;
  setView: (view: SamePageView) => void;
}>((set) => ({
  view: "play",
  setView: (view) => set({ view }),
}));

/** Opens Same Page on a given view; pass circleId when navigating to another circle. */
export function openSamePage(view: SamePageView = "play", circleId?: string) {
  useSamePageViewStore.getState().setView(view);
  useGameRoomStore.getState().openGame(SAME_PAGE_GAME_ID, circleId);
}
