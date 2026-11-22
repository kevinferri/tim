"use client";

import { create } from "zustand";

const SEEN_KEY = (circleId: string) => `news-seen:${circleId}`;

function readSeen(circleId: string): string | null {
  try {
    return localStorage.getItem(SEEN_KEY(circleId));
  } catch {
    return null;
  }
}

type NewsState = {
  open: boolean;
  /** The source filter selected in each circle's panel (null = All). */
  filter: Record<string, string | null>;
  setFilter: (circleId: string, feedId: string | null) => void;
  /** Newest createdAt the viewer has seen, per circle (mirrored to localStorage). */
  seen: Record<string, string | null>;
  openPanel: () => void;
  close: () => void;
  getSeen: (circleId: string) => string | null;
  markSeen: (circleId: string, createdAt: string | null) => void;
};

export const useNewsStore = create<NewsState>((set, get) => ({
  open: false,
  filter: {},
  setFilter: (circleId, feedId) =>
    set((s) => ({ filter: { ...s.filter, [circleId]: feedId } })),
  seen: {},
  openPanel: () => set({ open: true }),
  close: () => set({ open: false }),
  getSeen: (circleId) =>
    circleId in get().seen ? get().seen[circleId] : readSeen(circleId),
  markSeen: (circleId, createdAt) => {
    const current = get().getSeen(circleId);
    if (!createdAt || (current && current >= createdAt)) return;
    try {
      localStorage.setItem(SEEN_KEY(circleId), createdAt);
    } catch {}
    set((s) => ({ seen: { ...s.seen, [circleId]: createdAt } }));
  },
}));

export function useNewsSeen(circleId: string) {
  return useNewsStore((s) =>
    circleId in s.seen ? s.seen[circleId] : readSeen(circleId),
  );
}
