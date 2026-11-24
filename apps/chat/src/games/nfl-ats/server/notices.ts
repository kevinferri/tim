import { NotificationType } from "@tim/socket-types";
import { prismaClient } from "@/lib/prisma/client";

export type NoticeKind = "slate" | "results";

const NOTIFICATION_TYPE: Record<NoticeKind, NotificationType> = {
  slate: NotificationType.NflAtsSlatePosted,
  results: NotificationType.NflAtsResults,
};

/**
 * Tells a circle about a week once. The notice row is the claim -- its unique
 * key means a second run, or a second instance, inserts nothing and so sends
 * nothing. Both happen in one transaction, so a crash between the two can't
 * leave the week marked as announced.
 */
export async function notifyCircleAboutWeek({
  weekId,
  circleId,
  kind,
}: {
  weekId: string;
  circleId: string;
  kind: NoticeKind;
}): Promise<boolean> {
  const circle = await prismaClient.circle.findUnique({
    where: { id: circleId },
    select: { members: { select: { id: true } } },
  });
  const memberIds = (circle?.members ?? []).map((m) => m.id);
  if (memberIds.length === 0) return false;

  return prismaClient.$transaction(async (tx) => {
    const claimed = await tx.nflAtsNotice.createMany({
      data: [{ weekId, circleId, kind }],
      skipDuplicates: true,
    });
    if (claimed.count === 0) return false;

    await tx.notification.createMany({
      data: memberIds.map((recipientId) => ({
        type: NOTIFICATION_TYPE[kind],
        recipientId,
        circleId,
      })),
    });
    return true;
  });
}

/** True once every game in the week has a final score. */
export async function isWeekComplete(weekId: string): Promise<boolean> {
  const [total, completed] = await Promise.all([
    prismaClient.nflAtsGame.count({ where: { weekId } }),
    prismaClient.nflAtsGame.count({
      where: { weekId, completedAt: { not: null } },
    }),
  ]);
  return total > 0 && total === completed;
}
