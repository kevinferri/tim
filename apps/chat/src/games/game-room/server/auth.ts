import { prismaClient } from "@/lib/prisma/client";
import { ApiError, requireUserId } from "@/lib/api";

export type CircleRouteContext = { params: Promise<{ circleId: string }> };

/** Every game route's auth: signed in and a member of the circle in the URL. */
export async function requireCircleMember(context: CircleRouteContext) {
  const userId = await requireUserId();
  const { circleId } = await context.params;
  if (!circleId) throw new ApiError(400);
  if (!(await prismaClient.circle.isUserInCircle({ circleId, userId }))) {
    throw new ApiError(403);
  }
  return { userId, circleId };
}
