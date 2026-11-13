import { NextResponse } from "next/server";
import { requireCircleMember, type CircleRouteContext } from "./auth";
import { ApiError, apiRoute } from "@/lib/api";
import { getSeenBadgeKeys, markBadgesSeen } from "./seen";

const BADGE_KEY = /^[a-z0-9-]{1,64}:(play|results)$/;
const MAX_KEYS = 50;

export const GET = apiRoute(
  async (_request: Request, context: CircleRouteContext) => {
    const { userId, circleId } = await requireCircleMember(context);
    return NextResponse.json({
      badgeKeys: await getSeenBadgeKeys({ userId, circleId }),
    });
  },
);

export const POST = apiRoute(
  async (request: Request, context: CircleRouteContext) => {
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
