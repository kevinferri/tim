import { NextRequest, NextResponse } from "next/server";
import og from "fetch-opengraph";
import { getLoggedInUserId } from "@/lib/session";
import { hydrateUrl, isValidUrl } from "@/lib/utils";
import { badRequest } from "../error-responses";

export type LinkMetadataResponse = {
  ogSiteName?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  error?: string;
  ogVideo?: string;
};

export async function GET(request: NextRequest) {
  const userId = await getLoggedInUserId();
  const url = hydrateUrl(request.nextUrl.searchParams.get("url") ?? "");
  const isValid = isValidUrl(url);

  if (!userId || !isValid) return badRequest;

  try {
    const metadata = await og.fetch(url);
    if (!metadata) return badRequest;

    return NextResponse.json(
      {
        ogSiteName: metadata["og:site_name"],
        ogTitle: metadata["og:title"],
        ogDescription: metadata["og:description"],
        ogImage: isValidUrl(metadata.image) ? metadata.image : undefined,
        ogVideo: isValidUrl(metadata.video) ? metadata.video : undefined,
      } as LinkMetadataResponse,
      { status: 200 }
    );
  } catch (err) {
    return badRequest;
  }
}
