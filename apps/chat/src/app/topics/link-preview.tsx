"use client";

import { generatePreviewForLink } from "@/actions/messages";
import { useEffectOnce } from "@/lib/hooks";
import { useState } from "react";
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

type Props = {
  link: string;
  onLoadPreview?: () => void;
};

export function LinkPreview(props: Props) {
  const [ogData, setOgData] =
    useState<Awaited<ReturnType<typeof generatePreviewForLink>>>();

  useEffectOnce(() => {
    const fetchPreview = async () => {
      const resp = await generatePreviewForLink(props.link);
      props.onLoadPreview?.();
      setOgData(resp);
    };

    fetchPreview();
  });

  if (ogData === false) return null;

  return (
    <Link target="_blank" href={props.link}>
      <Card className="my-2 hover:bg-secondary shadow-md">
        <CardHeader className="p-4">
          {ogData ? (
            <>
              <div className="flex gap-2 items-center">
                <Avatar>
                  <AvatarImage src={ogData?.ogImage} />
                  <AvatarFallback>
                    <ExternalLinkIcon />
                  </AvatarFallback>
                </Avatar>
                <CardTitle>{ogData?.ogTitle}</CardTitle>
              </div>
              {ogData?.ogDescription && (
                <CardDescription>{ogData?.ogDescription}</CardDescription>
              )}
            </>
          ) : (
            <PreviewLoader />
          )}
        </CardHeader>
      </Card>
    </Link>
  );
}

function PreviewLoader() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-1 items-center">
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
