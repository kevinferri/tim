"use client";

import { create } from "zustand";
import type { NewsItemDto } from "./news-api";

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
  /** Live items that arrived while the panel was open, held back until the reader asks for them. */
  pending: Record<string, NewsItemDto[]>;
  /** The source filter selected in each circle's panel (null = All); live updates are judged against it. */
  filter: Record<string, string | null>;
  setFilter: (circleId: string, feedId: string | null) => void;
  /** Newest createdAt the viewer has seen, per circle (mirrored to localStorage). */
  seen: Record<string, string | null>;
  openPanel: () => void;
  close: () => void;
  addPending: (circleId: string, items: NewsItemDto[]) => void;
  takePending: (circleId: string) => NewsItemDto[];
  getSeen: (circleId: string) => string | null;
  markSeen: (circleId: string, createdAt: string | null) => void;
};

export const useNewsStore = create<NewsState>((set, get) => ({
  open: false,
  pending: {},
  filter: {},
  setFilter: (circleId, feedId) =>
    set((s) => ({ filter: { ...s.filter, [circleId]: feedId } })),
  seen: {},
  openPanel: () => set({ open: true }),
  close: () => set({ open: false }),
  addPending: (circleId, items) =>
    set((s) => {
      const existing = s.pending[circleId] ?? [];
      const known = new Set(existing.map((i) => i.id));
      return {
        pending: {
          ...s.pending,
          [circleId]: [...items.filter((i) => !known.has(i.id)), ...existing],
        },
      };
    }),
  takePending: (circleId) => {
    const items = get().pending[circleId] ?? [];
    set((s) => ({ pending: { ...s.pending, [circleId]: [] } }));
    return items;
  },
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
