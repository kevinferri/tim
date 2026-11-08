"use client";

import { create } from "zustand";
import type { GameId } from "@/components/games/game-registry";

export type SamePageView = "play" | "results" | "standings";

type GamesUiState = {
  open: boolean;
  /** null = hub list; otherwise a specific game. */
  activeGameId: GameId | null;
  samePageView: SamePageView;
  openHub: () => void;
  openSamePage: (view?: SamePageView) => void;
  close: () => void;
  setSamePageView: (view: SamePageView) => void;
  backToHub: () => void;
};

export const useGamesUiStore = create<GamesUiState>((set) => ({
  open: false,
  activeGameId: null,
  samePageView: "play",
  openHub: () => set({ open: true, activeGameId: null }),
  openSamePage: (view = "play") =>
    set({ open: true, activeGameId: "same-page", samePageView: view }),
  close: () => set({ open: false, activeGameId: null }),
  setSamePageView: (view) => set({ samePageView: view }),
  backToHub: () => set({ activeGameId: null }),
}));
