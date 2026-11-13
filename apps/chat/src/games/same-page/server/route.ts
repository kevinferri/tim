import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import {
  getGamesBadge,
  getSamePageState,
  getSockStatus,
  getStandings,
  isCircleAdmin,
  markPromptViewed,
  markResultsViewed,
  setSamePageEnabled,
  submitSamePageAnswer,
} from "./model";
import { ApiError, apiRoute, requireUserId } from "@/lib/api";

type RouteContext = { params: Promise<{ circleId: string }> };

/** The logged-in circle member making the request. */
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
  const view = new URL(request.url).searchParams.get("view");

  if (view === "badge") {
    const badge = await getGamesBadge({ circleId, userId });
    return NextResponse.json({ badge });
  }
  if (view === "standings") {
    const standings = await getStandings(circleId);
    return NextResponse.json({ standings });
  }
  if (view === "sock") {
    const sock = await getSockStatus(circleId);
    return NextResponse.json({ sock });
  }

  const state = await getSamePageState({ circleId, userId });
  return NextResponse.json(state);
});

// Validation failures from the model are thrown as ApiError(400) (SamePageValidationError).
export const POST = apiRoute(
  async (request: Request, context: RouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);

    const body = (await request.json().catch(() => null)) as {
      action?: string;
      text?: string;
      calledUserId?: string | null;
    } | null;
    if (!body?.action) throw new ApiError(400);

    if (body.action === "answer") {
      if (typeof body.text !== "string") throw new ApiError(400);
      if (body.calledUserId != null && typeof body.calledUserId !== "string") {
        throw new ApiError(400);
      }
      const answer = await submitSamePageAnswer({
        circleId,
        userId,
        text: body.text,
        calledUserId: body.calledUserId,
      });
      return NextResponse.json({ answer });
    }

    if (body.action === "view-prompt") {
      await markPromptViewed({ circleId, userId });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "view-results") {
      await markResultsViewed({ circleId, userId });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "enable" || body.action === "disable") {
      if (!(await isCircleAdmin(circleId, userId))) throw new ApiError(403);
      await setSamePageEnabled(circleId, body.action === "enable");
      return NextResponse.json({ ok: true });
    }

    throw new ApiError(400);
  },
);
