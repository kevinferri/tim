"use client";

import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      fetch(
        `/api/link-metadata?url=${encodeURIComponent(props.link)}`,
      ).then((r) => {
        if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
        return r.json() as Promise<LinkMetadataResponse>;
      }),
    enabled: !alreadyEmbedded && isVisible,
  });

  const clickedLink = useSocketEmit<{ messageId: string; topicId: string }>(
    SocketEvent.UserClickedLink,
  );

  if (alreadyEmbedded || error) return null;

  return (
    <div ref={containerRef} className="hidden md:block">
      {/* No header/PiP here -- ogVideo is an arbitrary scraped URL with no
          stable provider/videoId to match against global-player state,
          unlike the youtube/twitch VideoPlayer usages. Plain inline embed by
          design. */}
      {data?.ogVideo && !getYoutubeVideoFromUrl(data?.ogVideo) && (
        <VideoPlayer src={data.ogVideo} />
      )}
      <Link
        target="_blank"
        href={props.link}
        onClick={() => {
          clickedLink.emit({
            topicId: props.topicId,
            messageId: props.messageId,
          });
        }}
      >
        <Card className="my-2 hover:bg-secondary">
          <CardHeader className="p-4">
            {data ? (
              <>
                <div className="flex gap-3 items-start">
                  <div>
                    {data.ogImage ? (
                      <Avatar className="w-[160px] h-auto rounded-md">
                        <AvatarImage
                          src={data.ogImage}
                          className="aspect-auto"
                        />
                      </Avatar>
                    ) : (
                      <Avatar className="rounded-md w-12 h-12">
                        <AvatarFallback className="rounded-md">
                          <ExternalLinkIcon />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <CardTitle className="leading-snug flex flex-col font-semibold text-sm">
                      <div>{data.ogSiteName}</div>
                      <div>{data.ogTitle}</div>
                    </CardTitle>
                    {data.ogDescription && (
                      <CardDescription className="text-xs">
                        {data.ogDescription}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <PreviewLoader />
            )}
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}

function PreviewLoader() {
  return (
    <div className="flex gap-4">
      <Skeleton className="h-[100px] w-[140px] rounded-md flex-shrink-0" />
      <div className="flex flex-col gap-3 flex-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
