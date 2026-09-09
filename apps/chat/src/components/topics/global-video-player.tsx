"use client";

import { useEffect, useState } from "react";
import { VideoPlayer } from "@/components/topics/video-player";
import { useGlobalVideoPlayerStore } from "./global-video-player-store";

const isEditableElement = (el: Element | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLElement && el.contentEditable === "true");

export function GlobalVideoPlayer() {
  const [mounted, setMounted] = useState(false);

  const { isGlobalMode, data, setGlobalMode } = useGlobalVideoPlayerStore(
    (state) => ({
      isGlobalMode: state.isGlobalMode,
      data: state.data,
      setGlobalMode: state.setGlobalMode,
    }),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isGlobalMode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isEditableElement(document.activeElement)) return;

      setGlobalMode(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isGlobalMode, setGlobalMode]);

  if (!mounted || !isGlobalMode || !data) return null;

  return (
    <VideoPlayer
      src={data.iframeSrc}
      isGlobal
      onGlobalClick={() => setGlobalMode(false)}
    />
  );
}
