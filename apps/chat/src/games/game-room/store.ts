"use client";

import { create } from "zustand";

type GameRoomState = {
  open: boolean;
  /** Set when opened for a circle we're navigating to; the sheet waits for that circle. */
  circleId: string | null;
  /** null = the list of games; otherwise that game's panel. */
  activeGameId: string | null;
  openHub: () => void;
  openGame: (gameId: string, circleId?: string) => void;
  close: () => void;
  backToHub: () => void;
};

export const useGameRoomStore = create<GameRoomState>((set) => ({
  open: false,
  circleId: null,
  activeGameId: null,
  openHub: () => set({ open: true, circleId: null, activeGameId: null }),
  openGame: (gameId, circleId) =>
    set({ open: true, circleId: circleId ?? null, activeGameId: gameId }),
  close: () => set({ open: false, circleId: null, activeGameId: null }),
  backToHub: () => set({ activeGameId: null }),
}));

/** Badge query key; games invalidate it when their badge may have changed. */
export const gameRoomBadgeQueryKey = (circleId?: string) =>
  circleId ? ["games-badge", circleId] : ["games-badge"];
