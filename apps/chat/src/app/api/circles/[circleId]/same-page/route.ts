import { NextResponse } from "next/server";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import {
  getGamesBadge,
  getSamePageState,
  getSockStatus,
  getStandings,
  markResultsViewed,
  SamePageValidationError,
  submitSamePageAnswer,
} from "@/lib/same-page/same-page-model";
import { badRequest, unauthorized } from "@/app/api/error-responses";

type RouteContext = { params: Promise<{ circleId: string }> };

async function assertCircleMember(userId: string, circleId: string) {
  const circle = await prismaClient.circle.findFirst({
    where: { id: circleId, members: { some: { id: userId } } },
    select: { id: true },
  });
  return !!circle;
}

export async function GET(request: Request, context: RouteContext) {
  const userId = await getLoggedInUserId();
  if (!userId) return unauthorized;

  const { circleId } = await context.params;
  if (!circleId) return badRequest;
  if (!(await assertCircleMember(userId, circleId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const view = url.searchParams.get("view");

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
}

export async function POST(request: Request, context: RouteContext) {
  const userId = await getLoggedInUserId();
  if (!userId) return unauthorized;

  const { circleId } = await context.params;
  if (!circleId) return badRequest;
  if (!(await assertCircleMember(userId, circleId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    text?: string;
    calledUserId?: string | null;
  } | null;

  if (!body?.action) return badRequest;

  try {
    if (body.action === "answer") {
      if (typeof body.text !== "string") return badRequest;
      const answer = await submitSamePageAnswer({
        circleId,
        userId,
        text: body.text,
        calledUserId: body.calledUserId,
      });
      return NextResponse.json({ answer });
    }

    if (body.action === "view-results") {
      await markResultsViewed({ circleId, userId });
      return NextResponse.json({ ok: true });
    }

    return badRequest;
  } catch (err) {
    // Name check so mocked modules still classify validation errors correctly.
    if (
      err instanceof SamePageValidationError ||
      (err instanceof Error && err.name === "SamePageValidationError")
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[same-page] request failed", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
