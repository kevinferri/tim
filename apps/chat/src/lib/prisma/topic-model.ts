import { prismaClient } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export const topicModel = {
  async getAllForCircleAndUser({
    userId,
    circleId,
    select,
    orderBy,
  }: {
    userId?: string;
    circleId?: string;
    select: Prisma.TopicSelect;
    orderBy?: Prisma.TopicOrderByWithRelationInput;
  }) {
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

  async getByIdForUser({
    userId,
    topicId,
    circleId,
    select,
  }: {
    userId?: string;
    topicId: string;
    circleId: string;
    select: Prisma.TopicSelect;
  }) {
    if (!userId || !topicId || !circleId) {
      return undefined;
    }

    return await prismaClient.topic.findUnique({
      where: {
        id: topicId,
        circleId,
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

  // Fetches the topic, then delegates to circleModel.isUserInCircle on its
  // parent circle. Mirrors apps/realtime-server/src/db/queries.ts's
  // isUserInTopic/isUserInCircle split.
  async isUserInTopic({
    userId,
    topicId,
  }: {
    userId?: string;
    topicId?: string;
  }) {
    if (!userId || !topicId) return false;

    const topic = await prismaClient.topic.findUnique({
      where: { id: topicId },
      select: { circleId: true },
    });

    if (!topic) return false;

    return await prismaClient.circle.isUserInCircle({
      userId,
      circleId: topic.circleId,
    });
  },

  async upsertForUser({
    userId,
    circleId,
    topicId,
    name,
    description,
  }: {
    userId?: string;
    circleId: string;
    topicId: string | null;
    name: string;
    description: string | null;
  }) {
    if (!userId) return false;

    const isInCircle = await prismaClient.circle.isUserInCircle({
      userId,
      circleId,
    });

    if (!isInCircle) return false;

    const existingTopic = topicId
      ? await prismaClient.topic.findUnique({
          where: {
            id: topicId,
            circleId,
          },
          select: {
            id: true,
            userId: true,
          },
        })
      : undefined;

    // Make sure cur user is creator of current topic
    if (existingTopic && existingTopic.userId !== userId) return false;

    const payload = {
      userId,
      circleId,
      name,
      description,
    };

    const select = {
      id: true,
      name: true,
      circleId: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    } as const;

    const data = existingTopic
      ? await prismaClient.topic.update({
          where: { id: existingTopic.id },
          data: payload,
          select,
        })
      : await prismaClient.topic.create({
          data: payload,
          select,
        });

    // If new topic, create histories for members
    if (!existingTopic) {
      const circleMembers = await prismaClient.circle.findUnique({
        where: {
          id: data.circleId,
        },
        select: {
          members: {
            select: { id: true },
          },
        },
      });

      if (circleMembers?.members.length) {
        await prismaClient.topicHistory.createManyForUsers({
          topicId: data.id,
          userIds: circleMembers.members.map((member) => member.id),
        });
      }
    }

    return {
      data,
    };
  },

  async getNameWithMemberIds({ topicId }: { topicId: string }) {
    const topic = await prismaClient.topic.findFirst({
      where: { id: topicId },
      select: {
        name: true,
        parentCircle: {
          select: {
            members: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!topic) return undefined;

    return {
      name: topic.name,
      memberIds: topic.parentCircle.members.map(({ id }) => id),
    };
  },

  async deleteByIdForUser({
    userId,
    topicId,
    circleId,
  }: {
    userId?: string;
    topicId: string;
    circleId: string;
  }) {
    if (!userId || !topicId) {
      return false;
    }

    const topic = await prismaClient.topic.getByIdForUser({
      userId,
      topicId,
      circleId,
      select: {
        id: true,
        userId: true,
        parentCircle: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!topic) {
      return false;
    }

    const isInCircle = await prismaClient.circle.isUserInCircle({
      userId,
      circleId: topic.parentCircle.id,
    });

    if (!isInCircle || topic.userId !== userId) {
      return false;
    }

    const data = await prismaClient.topic.delete({
      where: {
        id: topicId,
      },
      select: {
        id: true,
        name: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        parentCircle: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      data,
    };
  },
};
