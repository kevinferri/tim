import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { ApiError, apiRoute, requireUserId } from "@/lib/api";
import {
  getGamesBadge,
  getSpellItOutState,
  isCircleAdmin,
  setSpellItOutEnabled,
  submitGuess,
} from "./model";

type RouteContext = { params: Promise<{ circleId: string }> };

async function requireCircleMember(context: RouteContext) {
  const userId = await requireUserId();
  const { circleId } = await context.params;
  if (!circleId) throw new ApiError(400);
  if (!(await prismaClient.circle.isUserInCircle({ circleId, userId }))) {
    throw new ApiError(403);
  }
  return { userId, circleId };
}

export const GET = apiRoute(async (request: Request, context: RouteContext) => {
  const { userId, circleId } = await requireCircleMember(context);
  if (new URL(request.url).searchParams.get("view") === "badge") {
    return NextResponse.json({
      badge: await getGamesBadge({ circleId, userId }),
    });
  }
  return NextResponse.json(await getSpellItOutState({ circleId, userId }));
});

export const POST = apiRoute(
  async (request: Request, context: RouteContext) => {
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
      await setSpellItOutEnabled(circleId, body.action === "enable");
      return NextResponse.json({ ok: true });
    }

    throw new ApiError(400);
  },
);
