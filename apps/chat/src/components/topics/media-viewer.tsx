"use client";

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

  const { openInGlobal, closeGlobal } = useGlobalVideoPlayer();
  const isGlobalMode = useGlobalVideoPlayerStore((s) => s.isGlobalMode);
  const globalData = useGlobalVideoPlayerStore((s) => s.data);

  const isPlayingInGlobal =
    isGlobalMode && globalData?.videoId === videoData?.videoId;

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
        <div className="relative w-fit max-w-sm max-h-sm cursor-zoom-in">
          <MediaViewerImage
            src={url}
            priority={priority}
            onLoad={onPreviewLoad}
            className="w-full rounded-sm shadow-lg hover:opacity-80"
          />
        </div>
      </DialogTrigger>

      <DialogContent className="w-max max-w-full max-h-full min-w-[450px] min-h-[450px] p-0">
        <MediaViewerImage
          src={url}
          priority={priority}
          className="w-full h-full rounded-lg"
        />
      </DialogContent>
    </Dialog>
  );
}
