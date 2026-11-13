import { NextResponse } from "next/server";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import {
  getGamesBadge,
  getSamePageState,
  getSockStatus,
  getStandings,
  isCircleAdmin,
  markPromptViewed,
  markResultsViewed,
  SamePageValidationError,
  setSamePageEnabled,
  submitSamePageAnswer,
} from "./model";
import { badRequest, unauthorized } from "@/app/api/error-responses";

type RouteContext = { params: Promise<{ circleId: string }> };

const forbidden = () =>
  NextResponse.json({ error: "Forbidden" }, { status: 403 });

/** The logged-in circle member making the request, or the error response to send. */
async function authorize(
  context: RouteContext,
): Promise<{ userId: string; circleId: string } | { error: Response }> {
  const userId = await getLoggedInUserId();
  if (!userId) return { error: unauthorized };

  const { circleId } = await context.params;
  if (!circleId) return { error: badRequest };
  if (!(await prismaClient.circle.isUserInCircle({ circleId, userId }))) {
    return { error: forbidden() };
  }
  return { userId, circleId };
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await authorize(context);
  if ("error" in auth) return auth.error;
  const { userId, circleId } = auth;

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
  const auth = await authorize(context);
  if ("error" in auth) return auth.error;
  const { userId, circleId } = auth;

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

    if (body.action === "view-prompt") {
      await markPromptViewed({ circleId, userId });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "view-results") {
      await markResultsViewed({ circleId, userId });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "enable" || body.action === "disable") {
      if (!(await isCircleAdmin(circleId, userId))) {
        return forbidden();
      }
      await setSamePageEnabled(circleId, body.action === "enable");
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
