import { prismaClient } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export const topicHistoryModel = {
  async getMostRecentForUser({ userId }: { userId?: string }) {
    if (!userId) return undefined;

    return await prismaClient.topicHistory.findFirst({
      // updatedAt, not createdAt: history rows are upserted in place on every visit, so createdAt only reflects the first-ever visit to a topic.
      orderBy: {
        updatedAt: "desc",
      },
      where: {
        userId,
        // Skips rows for circles the user has since left, rather than landing them somewhere they can't view.
        topic: { parentCircle: { members: { some: { id: userId } } } },
      },
      select: {
        topicId: true,
        topic: {
          select: {
            circleId: true,
          },
        },
      },
    });
  },

  async getUnreadTopicIds({
    userId,
    topicIds,
  }: {
    userId?: string;
    topicIds: string[];
  }): Promise<Record<string, boolean>> {
    if (!userId || !topicIds.length) return {};

    // One index probe per topic on (topicId, createdAt DESC) instead of scanning every message in the circle. A topic with no history row counts as read, and the user's own messages never make a topic unread for them.
    const rows = await prismaClient.$queryRaw<{ topicId: string }[]>`
      SELECT h."topicId"
      FROM "topic_histories" h
      WHERE h."userId" = ${userId}
        AND h."topicId" IN (${Prisma.join(topicIds)})
        AND EXISTS (
          SELECT 1 FROM "messages" m
          WHERE m."topicId" = h."topicId"
            AND m."createdAt" > h."updatedAt"
            AND m."userId" <> h."userId"
        )
    `;

    return Object.fromEntries(rows.map(({ topicId }) => [topicId, true]));
  },

  async createManyForUsers({
    topicId,
    userIds,
  }: {
    topicId: string;
    userIds: string[];
  }) {
    if (!userIds.length) return;

    await prismaClient.topicHistory.createMany({
      data: userIds.map((userId) => ({ topicId, userId })),
      skipDuplicates: true,
    });
  },
};
