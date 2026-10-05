import { PlayIcon, VideoIcon } from "@radix-ui/react-icons";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useLazyVisible } from "@/lib/hooks/use-lazy-visible";

type OembedResponse = { title?: string; author_name?: string };

type Props = {
  src: string;
  thumbnailUrl?: string;
  oembedUrl?: string;
  channelName?: string;
  onLoad?: () => void;
  skipVirtualization?: boolean;
  skipFacade?: boolean;
  isPlayingInGlobal?: boolean;
};

const frameContainerStyles = "relative pt-[56.25%]";

export function VideoPlayerFrame({
  src,
  thumbnailUrl,
  oembedUrl,
  channelName,
  onLoad,
  skipVirtualization = false,
  skipFacade = false,
  isPlayingInGlobal = false,
}: Props) {
  // Each live embed costs ~1MB of player JS plus ongoing main-thread work, so
  // only mount one when the user actually asks to play it.
  const [isActivated, setIsActivated] = useState(false);
  const showFacade = !skipFacade && !isActivated;

  const facadeRef = useRef<HTMLButtonElement | null>(null);
  const isVisible = useLazyVisible(facadeRef, {
    rootMargin: "200px",
    skip: skipVirtualization,
  });

  const { data: oembed } = useQuery({
    queryKey: ["oembed", oembedUrl],
    queryFn: async () => {
      const r = await fetch(oembedUrl!);
      if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
      return (await r.json()) as OembedResponse;
    },
    enabled: !!oembedUrl && showFacade && isVisible,
    staleTime: Infinity,
    retry: false,
  });

  const title = oembed?.title;
  const author = oembed?.author_name ?? channelName;

  if (isPlayingInGlobal) {
    return (
      <div className={frameContainerStyles}>
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-muted p-3 text-center">
          <VideoIcon className="h-5 w-5" />
          Playing in picture-in-picture
        </div>
      </div>
    );
  }

  if (showFacade) {
    return (
      <button
        ref={facadeRef}
        type="button"
        aria-label={title ? `Play ${title}` : "Play video"}
        onClick={() => setIsActivated(true)}
        className={cn("group block w-full bg-muted", frameContainerStyles)}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            loading={skipVirtualization ? "eager" : "lazy"}
            decoding="async"
            onLoad={onLoad}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <VideoIcon className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground" />
        )}
        {(title || author) && (
          <span className="absolute inset-x-0 top-0 flex flex-col bg-gradient-to-b from-black/75 to-transparent px-3 pt-2.5 pb-8 text-left text-white">
            {title && (
              <span className="truncate text-sm font-medium">{title}</span>
            )}
            {author && (
              <span className="truncate text-xs text-white/75">{author}</span>
            )}
          </span>
        )}
        <span className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-black/60 text-white transition-colors group-hover:bg-black/80">
          <PlayIcon className="size-6" />
        </span>
      </button>
    );
  }

  return (
    <div className={frameContainerStyles}>
      <iframe
        onLoad={onLoad}
        className="absolute top-0 left-0 w-full h-full"
        width="640"
        height="360"
        src={src}
        title="Video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
