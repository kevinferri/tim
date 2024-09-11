import { getLoggedInUserId } from "@/lib/session";
import { hydrateUrl, isValidUrl } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import ogs from "open-graph-scraper";
import { badRequest } from "../error-responses";

export type LinkMetadataResponse = {
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
    const metadata = await ogs({ url });

    return NextResponse.json(
      {
        ogTitle: metadata.result.ogSiteName,
        ogDescription: metadata.result.ogDescription,
        ogImage: metadata.result.ogImage?.[0].url,
        ogVideo: metadata.result.ogVideo?.[0].url,
      } as LinkMetadataResponse,
      { status: 200 }
    );
  } catch (err) {
    return badRequest;
  }
}
