"use client";

import { create } from "zustand";
import { useGameRoomStore } from "@/games/game-room";
import { SPELL_IT_OUT_GAME_ID } from "../lib/game-id";

export type SpellItOutView = "play" | "results" | "stats" | "settings";

export const useSpellItOutViewStore = create<{
  view: SpellItOutView;
  setView: (view: SpellItOutView) => void;
}>((set) => ({
  view: "play",
  setView: (view) => set({ view }),
}));

/** Opens Spell It Out on a given view; pass circleId when navigating to another circle. */
export function openSpellItOut(
  view: SpellItOutView = "play",
  circleId?: string,
) {
  useSpellItOutViewStore.getState().setView(view);
  useGameRoomStore.getState().openGame(SPELL_IT_OUT_GAME_ID, circleId);
}
