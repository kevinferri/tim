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
import { AttachmentFrame } from "./message-attachment";
import { ExternalLinkIcon } from "@radix-ui/react-icons";

type VideoProvider = {
  type: "youtube" | "twitch";
  label: string;
  match: (url: string) => { id: string; videoUrl: string } | undefined;
  getIframeSrc: (id: string) => string;
  getThumbnailUrl?: (id: string) => string;
  getOembedUrl?: (videoUrl: string) => string;
  getChannelName?: (id: string) => string;
};

const VIDEO_PROVIDERS: VideoProvider[] = [
  {
    type: "youtube",
    label: "YouTube",
    match: getYoutubeVideoFromUrl,
    getIframeSrc: (id: string) =>
      `https://www.youtube.com/embed/${id}?autoplay=1&color=white&disablekb=1&rel=0&modestbranding=1`,
    getThumbnailUrl: (id: string) =>
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    getOembedUrl: (videoUrl: string) =>
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`,
  },
  {
    type: "twitch",
    label: "Twitch",
    match: getTwitchStreamFromUrl,
    getIframeSrc: (id: string) =>
      `https://player.twitch.tv/?channel=${id}&parent=${window.location.hostname}&autoplay=true`,
    getChannelName: (id: string) => id,
  },
];

function prepareVideoPlayer(
  url: string,
): (VideoPlayerData & { label: string }) | undefined {
  for (const provider of VIDEO_PROVIDERS) {
    const match = provider.match(url);
    if (!match) continue;

    return {
      url,
      videoId: match.id,
      type: provider.type,
      iframeSrc: provider.getIframeSrc(match.id),
      thumbnailUrl: provider.getThumbnailUrl?.(match.id),
      oembedUrl: provider.getOembedUrl?.(match.videoUrl),
      channelName: provider.getChannelName?.(match.id),
      label: provider.label,
    };
  }
}

type Props = {
  url: string;
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
        thumbnailUrl={videoData.thumbnailUrl}
        oembedUrl={videoData.oembedUrl}
        channelName={videoData.channelName}
        onPreviewLoad={onPreviewLoad}
        skipVirtualization={skipVirtualization}
        isPlayingInGlobal={isPlayingInGlobal}
        onGlobalClick={handleGlobalClick}
        caption={
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground"
          >
            {videoData.label}
            <ExternalLinkIcon className="size-3" />
          </a>
        }
      />
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild onClick={onImageExpanded}>
        <div className="w-fit max-w-full cursor-zoom-in">
          <AttachmentFrame fit>
            <MediaViewerImage
              src={url}
              priority={priority}
              onLoad={onPreviewLoad}
              className="block h-auto max-h-96 w-auto max-w-full hover:opacity-90"
            />
          </AttachmentFrame>
        </div>
      </DialogTrigger>

      {/* w-max: auto width on a left-50% fixed box would cap at 50vw */}
      <DialogContent className="w-max max-w-none p-0">
        <MediaViewerImage
          src={url}
          priority={priority}
          className="w-auto h-auto max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] rounded-md"
        />
      </DialogContent>
    </Dialog>
  );
}
