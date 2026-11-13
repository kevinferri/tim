import { NextResponse } from "next/server";
import {
  requireCircleMember,
  type CircleRouteContext,
} from "@/games/game-room/server";
import { ApiError, apiRoute } from "@/lib/api";
import {
  getGamesBadge,
  getWordsmithState,
  isCircleAdmin,
  setWordsmithEnabled,
  submitGuess,
} from "./model";

export const GET = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    if (new URL(request.url).searchParams.get("view") === "badge") {
      return NextResponse.json({
        badge: await getGamesBadge({ circleId, userId }),
      });
    }
    return NextResponse.json(await getWordsmithState({ circleId, userId }));
  },
);

export const POST = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    const body = (await request.json().catch(() => null)) as {
      action?: string;
      guess?: unknown;
    } | null;

    if (body?.action === "guess") {
      if (typeof body.guess !== "string") throw new ApiError(400);
      const play = await submitGuess({ circleId, userId, guess: body.guess });
      return NextResponse.json({ play });
    }

    if (body?.action === "enable" || body?.action === "disable") {
      if (!(await isCircleAdmin(circleId, userId))) throw new ApiError(403);
      await setWordsmithEnabled(circleId, body.action === "enable");
      return NextResponse.json({ ok: true });
    }

    throw new ApiError(400);
  },
);
