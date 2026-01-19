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
  setGlobalMode: (isGlobal: boolean) => set({ isGlobalMode: isGlobal }),
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
