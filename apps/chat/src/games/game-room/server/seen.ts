import { prismaClient } from "@/lib/prisma/client";
import { getGameRoomDay } from "../day";

/** Badge keys ("<gameId>:<badge>") the Game room button already showed this user today. */
export async function getSeenBadgeKeys({
  userId,
  circleId,
  now = new Date(),
}: {
  userId: string;
  circleId: string;
  now?: Date;
}): Promise<string[]> {
  const row = await prismaClient.gameRoomSeen.findUnique({
    where: { userId_circleId: { userId, circleId } },
    select: { day: true, badgeKeys: true },
  });
  return row?.day === getGameRoomDay(now) ? row.badgeKeys : [];
}

/** Adds to today's seen keys; a new day starts from scratch. Returns today's full set. */
export async function markBadgesSeen({
  userId,
  circleId,
  badgeKeys,
  now = new Date(),
}: {
  userId: string;
  circleId: string;
  badgeKeys: string[];
  now?: Date;
}): Promise<string[]> {
  const day = getGameRoomDay(now);
  const seen = await getSeenBadgeKeys({ userId, circleId, now });
  const merged = [...new Set([...seen, ...badgeKeys])];
  await prismaClient.gameRoomSeen.upsert({
    where: { userId_circleId: { userId, circleId } },
    create: { userId, circleId, day, badgeKeys: merged },
    update: { day, badgeKeys: merged },
  });
  return merged;
}
