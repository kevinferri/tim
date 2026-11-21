import { NextResponse } from "next/server";
import {
  requireCircleMember,
  type CircleRouteContext,
} from "@/games/game-room/server";
import { getUpDownStandings } from "@/games/casino/server";
import { ApiError, apiRoute } from "@/lib/api";
import { getBlackjackState, isCircleAdmin, setBlackjackEnabled } from "./model";

export const GET = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    if (new URL(request.url).searchParams.get("view") === "standings") {
      return NextResponse.json({
        standings: await getUpDownStandings(circleId),
      });
    }
    return NextResponse.json(await getBlackjackState(circleId, userId));
  },
);

export const POST = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    const body = (await request.json().catch(() => null)) as {
      action?: string;
    } | null;

    if (body?.action === "enable" || body?.action === "disable") {
      if (!(await isCircleAdmin(circleId, userId))) throw new ApiError(403);
      await setBlackjackEnabled(circleId, body.action === "enable");
      return NextResponse.json({ ok: true });
    }

    throw new ApiError(400);
  },
);
