// Game room server entry point: which games are on in which circles, and what the button has shown you today.
import { prismaClient } from "@/lib/prisma/client";

export { GET, POST } from "./route";
export { getSeenBadgeKeys, markBadgesSeen } from "./seen";

export async function isGameEnabled(circleId: string, gameId: string) {
  const row = await prismaClient.circleGame.findUnique({
    where: { circleId_gameId: { circleId, gameId } },
    select: { circleId: true },
  });
  return !!row;
}

/** Caller must have checked isCircleAdmin. Turning a game off keeps its data. */
export async function setGameEnabled(
  circleId: string,
  gameId: string,
  enabled: boolean,
) {
  if (enabled) {
    await prismaClient.circleGame.upsert({
      where: { circleId_gameId: { circleId, gameId } },
      create: { circleId, gameId },
      update: {},
    });
  } else {
    await prismaClient.circleGame.deleteMany({ where: { circleId, gameId } });
  }
}

export async function getCircleIdsWithGame(gameId: string) {
  const rows = await prismaClient.circleGame.findMany({
    where: { gameId },
    select: { circleId: true },
  });
  return rows.map((r) => r.circleId);
}

/** The circle's creator is its admin, the only one who can turn games on or off. */
export async function isCircleAdmin(circleId: string, userId: string) {
  const circle = await prismaClient.circle.findUnique({
    where: { id: circleId },
    select: { userId: true },
  });
  return circle?.userId === userId;
}
