import type { NotificationType } from "@tim/socket-types";
import { prismaClient } from "@/lib/prisma/client";

export type Tx = Parameters<Parameters<typeof prismaClient.$transaction>[0]>[0];

/** Saves a circle notification for every member but the actor, inside the caller's transaction. */
export async function notifyCircleMembers(
  tx: Tx,
  {
    circleId,
    actorId,
    type,
  }: { circleId: string; actorId: string; type: NotificationType },
) {
  const circle = await tx.circle.findUnique({
    where: { id: circleId },
    select: { members: { select: { id: true } } },
  });
  const recipientIds = (circle?.members ?? [])
    .map((m) => m.id)
    .filter((id) => id !== actorId);
  if (recipientIds.length === 0) return;

  await tx.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      type,
      recipientId,
      actorId,
      circleId,
    })),
  });
}
