import { prismaClient } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export const topicReadStateModel = {
  async getMostRecentlyReadForUser({ userId }: { userId?: string }) {
    if (!userId) return undefined;

    return await prismaClient.topicReadState.findFirst({
      orderBy: {
        lastReadAt: "desc",
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

    // One index probe per topic on (topicId, createdAt DESC) instead of scanning every message in the circle. A topic with no read-state row counts as read, and the user's own messages never make a topic unread for them.
    const rows = await prismaClient.$queryRaw<{ topicId: string }[]>`
      SELECT h."topicId"
      FROM "topic_read_states" h
      WHERE h."userId" = ${userId}
        AND h."topicId" IN (${Prisma.join(topicIds)})
        AND EXISTS (
          SELECT 1 FROM "messages" m
          WHERE m."topicId" = h."topicId"
            AND m."createdAt" > h."lastReadAt"
            AND m."userId" <> h."userId"
        )
    `;

    return Object.fromEntries(rows.map(({ topicId }) => [topicId, true]));
  },

  // Same unread rule as getUnreadTopicIds, rolled up per circle; muted topics never make a circle unread.
  async getUnreadCircleIds({
    userId,
    circleIds,
  }: {
    userId?: string;
    circleIds: string[];
  }): Promise<Record<string, boolean>> {
    if (!userId || !circleIds.length) return {};

    const rows = await prismaClient.$queryRaw<{ circleId: string }[]>`
      SELECT DISTINCT t."circleId"
      FROM "topic_read_states" h
      JOIN "topics" t ON t."id" = h."topicId"
      WHERE h."userId" = ${userId}
        AND t."circleId" IN (${Prisma.join(circleIds)})
        AND NOT EXISTS (
          SELECT 1 FROM "topic_preferences" p
          WHERE p."topicId" = h."topicId"
            AND p."userId" = h."userId"
            AND p."isMuted"
        )
        AND EXISTS (
          SELECT 1 FROM "messages" m
          WHERE m."topicId" = h."topicId"
            AND m."createdAt" > h."lastReadAt"
            AND m."userId" <> h."userId"
        )
    `;

    return Object.fromEntries(rows.map(({ circleId }) => [circleId, true]));
  },

  // Pass `client` to run inside a transaction; otherwise it would silently escape it.
  async createManyForUsers({
    topicId,
    userIds,
    client,
  }: {
    topicId: string;
    userIds: string[];
    client?: {
      topicReadState: {
        createMany: (
          args: Prisma.TopicReadStateCreateManyArgs,
        ) => PromiseLike<unknown>;
      };
    };
  }) {
    if (!userIds.length) return;

    await (client ?? prismaClient).topicReadState.createMany({
      data: userIds.map((userId) => ({ topicId, userId })),
      skipDuplicates: true,
    });
  },
};
