"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/topics/video-player";
import {
  useGlobalVideoPlayer,
  useGlobalVideoPlayerStore,
  VideoPlayerData,
} from "@/components/topics/global-video-player-store";
import {
  getTwitchStreamFromUrl,
  getYoutubeVideoFromUrl,
} from "./message-utils";
import { MediaViewerImage } from "./media-viewer-image";

type VideoProvider = {
  type: "youtube" | "twitch";
  match: (url: string) => { id: string; videoUrl: string } | undefined;
  getIframeSrc: (id: string) => string;
};

const VIDEO_PROVIDERS: VideoProvider[] = [
  {
    type: "youtube",
    match: getYoutubeVideoFromUrl,
    getIframeSrc: (id: string) =>
      `https://www.youtube.com/embed/${id}?color=white&disablekb=1&rel=0&modestbranding=1`,
  },
  {
    type: "twitch",
    match: getTwitchStreamFromUrl,
    getIframeSrc: (id: string) =>
      `https://player.twitch.tv/?channel=${id}&parent=${window.location.hostname}`,
  },
];

function prepareVideoPlayer(url: string): VideoPlayerData | undefined {
  for (const provider of VIDEO_PROVIDERS) {
    const match = provider.match(url);
    if (!match) continue;

    return {
      url,
      videoId: match.id,
      type: provider.type,
      iframeSrc: provider.getIframeSrc(match.id),
    };
  }
}

type Props = {
  url: string;
  variant?: "default" | "minimal";
  onPreviewLoad?: () => void;
  onImageExpanded?: () => void;
  priority?: boolean;
  skipVirtualization?: boolean;
};

export function MediaViewer({
  url,
  onPreviewLoad,
  onImageExpanded,
  priority,
  skipVirtualization,
}: Props) {
  const videoData = prepareVideoPlayer(url);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { openInGlobal, closeGlobal } = useGlobalVideoPlayer();
  const isGlobalMode = useGlobalVideoPlayerStore((s) => s.isGlobalMode);
  const globalData = useGlobalVideoPlayerStore((s) => s.data);

  const isPlayingInGlobal =
    isGlobalMode &&
    globalData?.type === videoData?.type &&
    globalData?.videoId === videoData?.videoId;

  const handleGlobalClick = () => {
    if (!videoData) return;

    isPlayingInGlobal ? closeGlobal() : openInGlobal(videoData);
  };

  if (videoData) {
    return (
      <VideoPlayer
        src={videoData.iframeSrc}
        onPreviewLoad={onPreviewLoad}
        skipVirtualization={skipVirtualization}
        isPlayingInGlobal={isPlayingInGlobal}
        onGlobalClick={handleGlobalClick}
      />
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild onClick={onImageExpanded}>
        <div
          className={cn(
            "relative w-fit max-w-sm max-h-sm cursor-zoom-in",
            // Reserves a placeholder footprint until the real image dimensions are known, so it doesn't pop in from zero height.
            !imageLoaded && "w-full aspect-[4/3] rounded-md bg-muted animate-pulse",
          )}
        >
          <MediaViewerImage
            src={url}
            priority={priority}
            onLoad={() => {
              setImageLoaded(true);
              onPreviewLoad?.();
            }}
            className={cn(
              "w-full rounded-md shadow-lg hover:opacity-80",
              !imageLoaded && "invisible absolute inset-0",
            )}
          />
        </div>
      </DialogTrigger>

      <DialogContent className="w-max max-w-full max-h-full min-w-[450px] min-h-[450px] p-0">
        <MediaViewerImage
          src={url}
          priority={priority}
          className="w-full h-full rounded-md"
        />
      </DialogContent>
    </Dialog>
  );
}
