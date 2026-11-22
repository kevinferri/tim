import { NextResponse } from "next/server";
import { ApiError, apiRoute } from "@/lib/api";
import { getCircleNews, setNewsEnabled } from "@/lib/news";
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

/** Turns News on or off for the circle; only its creator can. */
export const PATCH = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    const body = (await request.json().catch(() => null)) as {
      enabled?: unknown;
    } | null;
    if (typeof body?.enabled !== "boolean") throw new ApiError(400);
    await setNewsEnabled({ circleId, userId, enabled: body.enabled });
    return NextResponse.json({ ok: true });
  },
);
