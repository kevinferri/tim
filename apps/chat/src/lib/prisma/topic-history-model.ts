import { prismaClient } from "@/lib/prisma/client";

export const topicHistoryModel = {
  async getMostRecentForUser({ userId }: { userId?: string }) {
    if (!userId) return undefined;

    return await prismaClient.topicHistory.findFirst({
      orderBy: {
        createdAt: "desc",
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
