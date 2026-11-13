"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

// Current circle's mute state, shared so the tab-title badge can skip muted topics.
type Store = {
  serverMuted: Record<string, boolean>;
  // Optimistic toggles; cleared only on failure (see TopicsList).
  overrides: Record<string, boolean>;
  hydrateMutedTopics: (serverMuted: Record<string, boolean>) => void;
  setMuteOverride: (topicId: string, isMuted: boolean) => void;
  clearMuteOverride: (topicId: string) => void;
};

const useStore = create<Store>((set) => ({
  serverMuted: {},
  overrides: {},
  hydrateMutedTopics: (serverMuted) => set({ serverMuted }),
  setMuteOverride: (topicId, isMuted) =>
    set((state) => ({ overrides: { ...state.overrides, [topicId]: isMuted } })),
  clearMuteOverride: (topicId) =>
    set((state) => {
      const overrides = { ...state.overrides };
      delete overrides[topicId];
      return { overrides };
    }),
}));

export function isTopicMuted(topicId: string) {
  const { overrides, serverMuted } = useStore.getState();
  return overrides[topicId] ?? serverMuted[topicId] ?? false;
}

export function useMutedTopics() {
  const overrides = useStore(useShallow((state) => state.overrides));
  const hydrateMutedTopics = useStore((state) => state.hydrateMutedTopics);
  const setMuteOverride = useStore((state) => state.setMuteOverride);
  const clearMuteOverride = useStore((state) => state.clearMuteOverride);

  return { overrides, hydrateMutedTopics, setMuteOverride, clearMuteOverride };
}
