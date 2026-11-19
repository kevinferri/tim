import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { getCircleNews } from "@/lib/news";
import {
  requireCircleMember,
  type CircleRouteContext,
} from "@/games/game-room/server";

export const GET = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    const params = new URL(request.url).searchParams;
    return NextResponse.json(
      await getCircleNews({
        circleId,
        userId,
        feedId: params.get("feedId"),
        cursor: params.get("cursor"),
      }),
    );
  },
);
