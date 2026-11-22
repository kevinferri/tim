import { NextResponse } from "next/server";
import { ApiError, apiRoute } from "@/lib/api";
import { addCircleNewsSource, feedForSourceRequest } from "@/lib/news";
import {
  requireCircleMember,
  type CircleRouteContext,
} from "@/games/game-room/server";

export const POST = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    const body = (await request.json().catch(() => null)) as {
      preset?: unknown;
      topic?: unknown;
    } | null;
    const feed =
      typeof body?.preset === "string"
        ? feedForSourceRequest({ preset: body.preset })
        : typeof body?.topic === "string"
          ? feedForSourceRequest({ topic: body.topic })
          : null;
    if (!feed) throw new ApiError(400);
    const source = await addCircleNewsSource({ circleId, userId, ...feed });
    return NextResponse.json({ source }, { status: 201 });
  },
);
