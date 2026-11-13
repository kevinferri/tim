import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { ApiError, apiRoute, requireUserId } from "@/lib/api";
import { getSeenBadgeKeys, markBadgesSeen } from "./seen";

type RouteContext = { params: Promise<{ circleId: string }> };

const BADGE_KEY = /^[a-z0-9-]{1,64}:(play|results)$/;
const MAX_KEYS = 50;

async function requireCircleMember(context: RouteContext) {
  const userId = await requireUserId();
  const { circleId } = await context.params;
  if (!circleId) throw new ApiError(400);
  if (!(await prismaClient.circle.isUserInCircle({ circleId, userId }))) {
    throw new ApiError(403);
  }
  return { userId, circleId };
}

export const GET = apiRoute(
  async (_request: Request, context: RouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    return NextResponse.json({
      badgeKeys: await getSeenBadgeKeys({ userId, circleId }),
    });
  },
);

export const POST = apiRoute(
  async (request: Request, context: RouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    const body = (await request.json().catch(() => null)) as {
      badgeKeys?: unknown;
    } | null;
    const badgeKeys = body?.badgeKeys;
    if (
      !Array.isArray(badgeKeys) ||
      badgeKeys.length > MAX_KEYS ||
      !badgeKeys.every((k) => typeof k === "string" && BADGE_KEY.test(k))
    ) {
      throw new ApiError(400);
    }
    return NextResponse.json({
      badgeKeys: await markBadgesSeen({ userId, circleId, badgeKeys }),
    });
  },
);
