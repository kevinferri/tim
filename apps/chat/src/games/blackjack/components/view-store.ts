"use client";

import { create } from "zustand";

export type BlackjackView = "play" | "standings" | "settings";

export const useBlackjackViewStore = create<{
  /** The tab picked; shared across circles, so the panel may show another. */
  view: BlackjackView;
  setView: (view: BlackjackView) => void;
  /** The tab actually on screen; null while loading or off. */
  shown: BlackjackView | null;
  setShown: (shown: BlackjackView | null) => void;
}>((set) => ({
  view: "play",
  setView: (view) => set({ view }),
  shown: null,
  setShown: (shown) => set({ shown }),
}));
