"use client";

import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { LinkMetadataResponse } from "@/app/api/link-metadata/route";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import {
  getTwitchStreamFromUrl,
  getYoutubeVideoFromUrl,
} from "@/components/topics/message-utils";
import { VideoPlayer } from "@/components/topics/video-player";
import { useLazyVisible } from "@/lib/hooks/use-lazy-visible";
import { AttachmentFrame } from "@/components/topics/message-attachment";

type Props = {
  link: string;
  messageId: string;
  topicId: string;
  mediaUrl?: string | null;
};

function getVideoIdentity(url?: string | null) {
  if (!url) return undefined;

  const youtube = getYoutubeVideoFromUrl(url);
  if (youtube) return { type: "youtube" as const, id: youtube.id };

  const twitch = getTwitchStreamFromUrl(url);
  if (twitch) return { type: "twitch" as const, id: twitch.id };

  return undefined;
}

// True only for the one youtube/twitch link already shown via MediaViewer's
// mediaUrl (compared by video id, not domain) -- a message can have more
// than one such link, and only the first becomes mediaUrl.
function isAlreadyEmbeddedAsMedia(link: string, mediaUrl?: string | null) {
  const linkVideo = getVideoIdentity(link);
  if (!linkVideo) return false;

  const mediaVideo = getVideoIdentity(mediaUrl);
  return (
    !!mediaVideo &&
    mediaVideo.type === linkVideo.type &&
    mediaVideo.id === linkVideo.id
  );
}

export function LinkPreview(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useLazyVisible(containerRef, { rootMargin: "200px" });

  const alreadyEmbedded = useMemo(
    () => isAlreadyEmbeddedAsMedia(props.link, props.mediaUrl),
    [props.link, props.mediaUrl],
  );

  const { data, error } = useQuery({
    queryKey: ["link-metadata", props.link],
    queryFn: () =>
      fetch(`/api/link-metadata?url=${encodeURIComponent(props.link)}`).then(
        (r) => {
          if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
          return r.json() as Promise<LinkMetadataResponse>;
        },
      ),
    enabled: !alreadyEmbedded && isVisible,
  });

  const clickedLink = useSocketEmit<{ messageId: string; topicId: string }>(
    SocketEvent.UserClickedLink,
  );

  if (alreadyEmbedded || error) return null;

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      {/* No header/PiP here -- ogVideo is an arbitrary scraped URL with no
          stable provider/videoId to match against global-player state,
          unlike the youtube/twitch VideoPlayer usages. Plain inline embed by
          design. */}
      {data?.ogVideo && !getYoutubeVideoFromUrl(data?.ogVideo) && (
        <div className="hidden md:block">
          <VideoPlayer src={data.ogVideo} />
        </div>
      )}
      <AttachmentFrame className="transition-colors hover:bg-secondary">
        <Link
          target="_blank"
          href={props.link}
          className="flex gap-3 p-2.5"
          onClick={() => {
            clickedLink.emit({
              topicId: props.topicId,
              messageId: props.messageId,
            });
          }}
        >
          {data ? (
            <>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-xs text-muted-foreground">
                  {data.ogSiteName || hostname(props.link)}
                </span>
                {data.ogTitle && (
                  <span className="line-clamp-2 text-sm font-semibold leading-snug">
                    {data.ogTitle}
                  </span>
                )}
                {data.ogDescription && (
                  <span className="line-clamp-2 text-xs leading-snug text-muted-foreground max-sm:hidden">
                    {data.ogDescription}
                  </span>
                )}
              </div>
              {data.ogImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.ogImage}
                  alt=""
                  className="size-14 shrink-0 rounded-md object-cover sm:size-20"
                />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <ExternalLinkIcon />
                </div>
              )}
            </>
          ) : (
            <PreviewLoader />
          )}
        </Link>
      </AttachmentFrame>
    </div>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function PreviewLoader() {
  return (
    <div className="flex flex-1 gap-3">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="size-14 shrink-0 rounded-md sm:size-20" />
    </div>
  );
}
