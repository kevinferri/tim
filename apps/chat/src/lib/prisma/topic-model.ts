import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import { Prisma } from "@prisma/client";

export const topicModel = {
  async getMeAllTopicsForCircle({
    circleId,
    select,
    orderBy,
  }: {
    circleId?: string;
    select: Prisma.TopicSelect;
    orderBy?: Prisma.TopicOrderByWithRelationInput;
  }) {
    const userId = await getLoggedInUserId();
    if (!userId || !circleId) return undefined;

    return await prismaClient.topic.findMany({
      orderBy,
      select,
      where: {
        circleId,
        parentCircle: {
          members: {
            some: {
              id: userId,
            },
          },
        },
      },
    });
  },

  async getMeTopicById({
    topicId,
    select,
  }: {
    topicId?: string;
    select: Prisma.TopicSelect;
  }) {
    const userId = await getLoggedInUserId();
    if (!userId || !topicId) return undefined;

    return await prismaClient.topic.findUnique({
      where: {
        id: topicId,
        parentCircle: {
          members: {
            some: {
              id: userId,
            },
          },
        },
      },
      select,
    });
  },
};
