import { NextResponse } from "next/server";
import {
  requireCircleMember,
  type CircleRouteContext,
} from "@/games/game-room/server";
import { ApiError, apiRoute } from "@/lib/api";
import { isPickSide } from "../lib/grade";
import {
  getNflAtsBadge,
  getNflAtsState,
  isCircleAdmin,
  setNflAtsEnabled,
  submitPick,
} from "./picks";
import { getStandings } from "./standings";

export const GET = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    const view = new URL(request.url).searchParams.get("view");
    if (view === "badge") {
      return NextResponse.json(await getNflAtsBadge({ circleId, userId }));
    }
    if (view === "standings") {
      return NextResponse.json(await getStandings({ circleId, userId }));
    }
    return NextResponse.json(await getNflAtsState({ circleId, userId }));
  },
);

export const POST = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    const body = (await request.json().catch(() => null)) as {
      action?: string;
      gameId?: unknown;
      side?: unknown;
    } | null;

    if (body?.action === "pick") {
      if (typeof body.gameId !== "string" || !isPickSide(body.side)) {
        throw new ApiError(400);
      }
      const pick = await submitPick({
        circleId,
        userId,
        gameId: body.gameId,
        side: body.side,
      });
      return NextResponse.json({ pick });
    }

    if (body?.action === "enable" || body?.action === "disable") {
      if (!(await isCircleAdmin(circleId, userId))) throw new ApiError(403);
      await setNflAtsEnabled(circleId, body.action === "enable");
      return NextResponse.json({ ok: true });
    }

    throw new ApiError(400);
  },
);
