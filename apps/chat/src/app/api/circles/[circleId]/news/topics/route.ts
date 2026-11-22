import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { getShareTopics } from "@/lib/news";
import {
  requireCircleMember,
  type CircleRouteContext,
} from "@/games/game-room/server";

export const GET = apiRoute(
  async (_request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    return NextResponse.json(await getShareTopics({ circleId, userId }));
  },
);
