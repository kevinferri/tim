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
      {}
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
};
