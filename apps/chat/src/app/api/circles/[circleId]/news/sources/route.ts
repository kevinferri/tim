import { NextResponse } from "next/server";
import { ApiError, apiRoute } from "@/lib/api";
import { addCircleNewsSource } from "@/lib/news";
import {
  requireCircleMember,
  type CircleRouteContext,
} from "@/games/game-room/server";

export const POST = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    const body = (await request.json().catch(() => null)) as {
      url?: unknown;
    } | null;
    if (typeof body?.url !== "string" || !body.url.trim()) {
      throw new ApiError(400);
    }
    const source = await addCircleNewsSource({
      circleId,
      userId,
      url: body.url,
    });
    return NextResponse.json({ source }, { status: 201 });
  },
);
