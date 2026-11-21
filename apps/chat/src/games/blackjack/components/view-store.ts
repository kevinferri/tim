"use client";

import { create } from "zustand";

export type BlackjackView = "play" | "standings" | "settings";

export const useBlackjackViewStore = create<{
  view: BlackjackView;
  setView: (view: BlackjackView) => void;
}>((set) => ({
  view: "play",
  setView: (view) => set({ view }),
}));
