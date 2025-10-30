import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useIntersection } from "@/lib/hooks/use-intersection";
import { useRef } from "react";
import {
  getTwitchStreamFromUrl,
  getYoutubeVideoFromUrl,
} from "@/components/topics/message-utils";

type Props = {
  url: string;
  variant?: "default" | "minimal";
  onPreviewLoad?: () => void;
  onImageExpanded?: () => void;
  priority?: boolean;
  skipVirtualization?: boolean;
};

export function ResponsiveVideoPlayer({
  src,
  onPreviewLoad,
  skipVirtualization = false,
}: {
  src: string;
  onPreviewLoad?: () => void;
  skipVirtualization?: boolean;
}) {
  const intersectionRef = useRef(null);
  const intersection = useIntersection(intersectionRef, {
    rootMargin: "20px",
  });

  return (
    <div className="max-w-[640px] shadow-lg" ref={intersectionRef}>
      <div className="relative pt-[56.25%]">
        {(skipVirtualization || intersection?.isIntersecting) && (
          <iframe
            onLoad={onPreviewLoad}
            className="rounded-sm absolute top-0 left-0 w-full h-full"
            width="640"
            height="360"
            src={src}
          />
        )}
      </div>
    </div>
  );
}

export function MediaViewer(props: Props) {
  let iframeSrc;
  const youtubeVideo = getYoutubeVideoFromUrl(props.url);
  const twitchStream = getTwitchStreamFromUrl(props.url);
  const imageProps = {
    src: props.url,
    alt: props.url,
    priority: props.priority,
    sizes: "100vw",
    width: 0,
    height: 0,
  };

  if (youtubeVideo) {
    iframeSrc = `https://www.youtube.com/embed/${
      youtubeVideo.id
    }?color=white&disablekb=1&rel=1${
      props.variant === "minimal" && `&controls=0`
    }`;
  }

  if (twitchStream) {
    iframeSrc = `https://player.twitch.tv/?channel=${twitchStream.id}&parent=${
      process.env.FRONTEND_URL ?? window.location.hostname
    }`;
  }

  if (iframeSrc) {
    return (
      <ResponsiveVideoPlayer
        onPreviewLoad={props.onPreviewLoad}
        src={iframeSrc}
        skipVirtualization={props.skipVirtualization}
      />
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild onClick={props.onImageExpanded}>
        <div className="relative cursor-zoom-in w-fit max-w-sm max-h-sm">
          <Image
            {...imageProps}
            alt={props.url}
            className="w-full rounded-sm shadow-lg hover:opacity-80"
            onLoad={props.onPreviewLoad}
          />
        </div>
      </DialogTrigger>
      <DialogContent className="w-max max-w-full max-h-full min-w-[450px] min-h-[450px] p-0">
        <Image
          {...imageProps}
          alt={props.url}
          className="w-full h-full rounded-lg"
        />
      </DialogContent>
    </Dialog>
  );
}
