import { getLoggedInUserId } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import urlMetadata from "url-metadata";

export async function GET(request: NextRequest) {
  // const userId = await getLoggedInUserId();
  // if (!userId) return NextResponse.json({});
  // const url = request.nextUrl.searchParams.get("url");
  // try {
  //   const metadata = await urlMetadata(encodeURIComponent(url));
  //   return NextResponse.json({
  //     ogDescription: metadata.description || metadata["og:description"],
  //     ogTitle: metadata.title || metadata["og:title"],
  //     ogImage: metadata.image || metadata["og:image"],
  //   });
  // } catch (err) {
  //   return NextResponse.json({});
  // }
}
