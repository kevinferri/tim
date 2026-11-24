"use client";

import { create } from "zustand";

export type NflAtsView = "picks" | "settings";

type State = {
  view: NflAtsView;
  setView: (view: NflAtsView) => void;
};

/** Which tab the panel is on, kept outside the panel so the sheet title can read it. */
export const useNflAtsViewStore = create<State>((set) => ({
  view: "picks",
  setView: (view) => set({ view }),
}));
