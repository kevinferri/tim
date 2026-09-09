"use client";

import { create } from "zustand";
import { useCallback } from "react";

export type VideoPlayerData = {
  url: string;
  type: "youtube" | "twitch";
  videoId: string;
  iframeSrc: string;
};

type Store = {
  isGlobalMode: boolean;
  data?: VideoPlayerData;
  setGlobalMode: (isGlobal: boolean) => void;
  setData: (data: VideoPlayerData) => void;
};

export const useGlobalVideoPlayerStore = create<Store>((set) => ({
  isGlobalMode: false,
  data: undefined,
  // Clear `data` on close (not just flip the flag) so the store doesn't
  // hang onto the last-played video indefinitely -- every isPlayingInGlobal
  // check elsewhere reads `data` alongside `isGlobalMode`, so a stale value
  // here is a bug waiting for the next feature that reads it on its own.
  setGlobalMode: (isGlobal: boolean) =>
    set((state) => ({
      isGlobalMode: isGlobal,
      data: isGlobal ? state.data : undefined,
    })),
  setData: (data: VideoPlayerData) => set({ data }),
}));

export function useGlobalVideoPlayer() {
  const setGlobalMode = useGlobalVideoPlayerStore(
    (state) => state.setGlobalMode,
  );
  const setData = useGlobalVideoPlayerStore((state) => state.setData);

  const openInGlobal = useCallback(
    (data: VideoPlayerData) => {
      setData(data);
      setGlobalMode(true);
    },
    [setData, setGlobalMode],
  );

  const closeGlobal = useCallback(() => {
    setGlobalMode(false);
  }, [setGlobalMode]);

  return {
    openInGlobal,
    closeGlobal,
  };
}
