import { NextRequest, NextResponse } from "next/server";
import og from "fetch-opengraph";
import { hydrateUrl, isValidUrl } from "@/lib/utils";
import { ApiError, apiRoute, requireUserId } from "@/lib/api";

export type LinkMetadataResponse = {
  ogSiteName?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  error?: string;
  ogVideo?: string;
};

export const GET = apiRoute(async (request: NextRequest) => {
  await requireUserId();

  const url = hydrateUrl(request.nextUrl.searchParams.get("url") ?? "");
  if (!isValidUrl(url)) throw new ApiError(400);

  // An unreachable or unparseable page is bad input from the caller, not a server error.
  const metadata = await og.fetch(url).catch(() => null);
  if (!metadata) throw new ApiError(400);

  return NextResponse.json(
    {
      ogSiteName: metadata["og:site_name"],
      ogTitle: metadata["og:title"],
      ogDescription: metadata["og:description"],
      ogImage: isValidUrl(metadata.image) ? metadata.image : undefined,
      ogVideo: isValidUrl(metadata.video) ? metadata.video : undefined,
    } as LinkMetadataResponse,
    { status: 200 },
  );
});
