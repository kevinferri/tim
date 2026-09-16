import { randomUUID } from "node:crypto";
import { prismaClient } from "@/lib/prisma/client";
import keyBy from "lodash.keyby";

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
      },
      select: {
        id: true,
        topicId: true,
        topic: {
          select: {
            circleId: true,
            parentCircle: {
              select: {
                id: true,
                members: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async deleteForTopicAndUser({
    topicId,
    userId,
  }: {
    topicId?: string;
    userId?: string;
  }) {
    if (!topicId || !userId) return;

    await prismaClient.topicHistory.deleteMany({
      where: {
        topicId,
        userId,
      },
    });
  },

  async getAllForUser({ userId }: { userId?: string }) {
    if (!userId) return [];

    return await prismaClient.topicHistory.findMany({
      where: {
        userId,
      },
      select: {
        updatedAt: true,
        topicId: true,
      },
    });
  },

  async getAllForUserAndCircle({
    userId,
    circleId,
  }: {
    userId?: string;
    circleId: string;
  }) {
    if (!userId) return [];

    return await prismaClient.topicHistory.findMany({
      where: {
        userId,
        topic: {
          circleId,
        },
      },
      select: {
        updatedAt: true,
        topicId: true,
        order: true,
      },
    });
  },

  async getUnreadTopicIds({
    userId,
    circleId,
    topicIds,
  }: {
    userId?: string;
    circleId: string;
    topicIds: string[];
  }): Promise<Record<string, boolean>> {
    if (!userId || !topicIds.length) return {};

    const [histories, recentMessagesByTopic] = await Promise.all([
      prismaClient.topicHistory.getAllForUserAndCircle({ userId, circleId }),
      prismaClient.message.getMostRecentTimestampsByTopic({ topicIds }),
    ]);

    const historyMap = keyBy(histories, "topicId");

    return recentMessagesByTopic.reduce<Record<string, boolean>>(
      (acc, { createdAt, topicId }) => {
        const history = historyMap[topicId];

        if (history && new Date(history.updatedAt) < new Date(createdAt)) {
          return {
            ...acc,
            [topicId]: true,
          };
        }

        return acc;
      },
      {},
    );
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

  // Persists the user's manual sidebar order for a circle's topics. Takes
  // the full visible order rather than a single moved item -- simpler than
  // fractional-index bookkeeping and cheap at per-circle topic counts.
  async reorderForUser({
    userId,
    circleId,
    orderedTopicIds,
  }: {
    userId?: string;
    circleId: string;
    orderedTopicIds: string[];
  }) {
    if (!userId || !orderedTopicIds.length) return false;

    const isInCircle = await prismaClient.circle.isUserInCircle({
      userId,
      circleId,
    });

    if (!isInCircle) return false;

    // Only persist order for topics that actually belong to this circle --
    // guards against a stale/tampered id list reordering a user's history
    // for a topic outside it.
    const topicsInCircle = await prismaClient.topic.findMany({
      where: { id: { in: orderedTopicIds }, circleId },
      select: { id: true },
    });
    const validTopicIds = new Set(topicsInCircle.map(({ id }) => id));
    const idsToOrder = orderedTopicIds.filter((id) => validTopicIds.has(id));

    if (!idsToOrder.length) return false;

    // Raw SQL rather than prismaClient.topicHistory.upsert(): an ORM-level
    // upsert would touch @updatedAt on every row regardless of which fields
    // changed, which getUnreadTopicIds reads as "last visited" -- a reorder
    // would silently clear a topic's unread badge. This only ever writes
    // `order` on conflict, leaving updatedAt (and createdAt) untouched.
    await prismaClient.$transaction(
      idsToOrder.map(
        (topicId, index) => prismaClient.$executeRaw`
          INSERT INTO "topic_histories" ("id", "userId", "topicId", "order")
          VALUES (${randomUUID()}, ${userId}, ${topicId}, ${index * 1000})
          ON CONFLICT ("userId", "topicId")
          DO UPDATE SET "order" = EXCLUDED."order"
        `,
      ),
    );

    return true;
  },
};
