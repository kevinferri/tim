import { getLoggedInUserId } from "@/lib/session";
import { hydrateUrl, isValidUrl } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import urlMetadata from "url-metadata";
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
    const metadata = await urlMetadata(decodeURI(url));

    return NextResponse.json(
      {
        ogDescription: metadata.description || metadata["og:description"],
        ogTitle: metadata.title || metadata["og:title"],
        ogImage: isValidUrl(metadata.image)
          ? metadata.image
          : metadata["og:image"],
        ogVideo: metadata["og:video:secure_url"] || metadata["og:video:url"],
      } as LinkMetadataResponse,
      { status: 200 }
    );
  } catch (err) {
    return badRequest;
  }
}
