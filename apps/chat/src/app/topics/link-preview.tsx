"use client";

import { useFetch, usePrevious } from "@/lib/hooks";
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
import { LinkMetadataResponse } from "@/api/link-metadata/route";
import { useEffect } from "react";
import { ResponsiveVideoPlayer, getYoutubeVideoFromUrl } from "./media-viewer";

type Props = {
  link: string;
  onLoadPreview?: () => void;
};

export function LinkPreview(props: Props) {
  const { data, error, loading } = useFetch<LinkMetadataResponse>(
    `/api/link-metadata?url=${encodeURIComponent(props.link)}`
  );
  const prevLoading = usePrevious(loading);
  const { onLoadPreview } = props;

  useEffect(() => {
    if (prevLoading && !loading) {
      onLoadPreview?.();
    }
  }, [loading, prevLoading, onLoadPreview]);

  if (error) return null;

  return (
    <>
      {data?.ogVideo && !getYoutubeVideoFromUrl(data?.ogVideo) && (
        <ResponsiveVideoPlayer
          src={data.ogVideo}
          onPreviewLoad={props.onLoadPreview}
        />
      )}
      <Link target="_blank" href={props.link}>
        <Card className="my-2 hover:bg-secondary">
          <CardHeader className="p-4">
            {data ? (
              <>
                <div className="flex gap-3 items-start">
                  <div>
                    {data.ogImage ? (
                      <Avatar className="w-[160px] h-auto rounded-sm">
                        <AvatarImage
                          src={data.ogImage}
                          className="aspect-auto"
                        />
                      </Avatar>
                    ) : (
                      <Avatar className="rounded-sm w-12 h-12">
                        <AvatarFallback className="rounded-sm">
                          <ExternalLinkIcon />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <CardTitle className="leading-snug">
                      {data.ogTitle}
                    </CardTitle>
                    {data.ogDescription && (
                      <CardDescription>{data.ogDescription}</CardDescription>
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
    </>
  );
}

function PreviewLoader() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-1 items-center">
        <Skeleton className="h-9 w-9 rounded-sm shrink-0" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
