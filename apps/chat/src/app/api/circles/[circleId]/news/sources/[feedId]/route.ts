import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api";
import { removeCircleNewsSource } from "@/lib/news";
import { requireCircleMember } from "@/games/game-room/server";

type Context = { params: Promise<{ circleId: string; feedId: string }> };

export const DELETE = apiRoute(async (_request: Request, context: Context) => {
  const { userId, circleId } = await requireCircleMember(context);
  const { feedId } = await context.params;
  await removeCircleNewsSource({ circleId, feedId, userId });
  return NextResponse.json({ ok: true });
});
