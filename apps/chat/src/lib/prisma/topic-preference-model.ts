import { prismaClient } from "@/lib/prisma/client";

export const topicPreferenceModel = {
  async getAllForUserAndCircle({
    userId,
    circleId,
  }: {
    userId?: string;
    circleId: string;
  }) {
    if (!userId) return [];

    return await prismaClient.topicPreference.findMany({
      where: {
        userId,
        topic: {
          circleId,
        },
      },
      select: {
        topicId: true,
        order: true,
        isMuted: true,
      },
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
    // guards against a stale/tampered id list reordering a user's
    // preferences for a topic outside it.
    const topicsInCircle = await prismaClient.topic.findMany({
      where: { id: { in: orderedTopicIds }, circleId },
      select: { id: true },
    });
    const validTopicIds = new Set(topicsInCircle.map(({ id }) => id));
    const idsToOrder = orderedTopicIds.filter((id) => validTopicIds.has(id));

    if (!idsToOrder.length) return false;

    await prismaClient.$transaction(
      idsToOrder.map((topicId, index) =>
        prismaClient.topicPreference.upsert({
          where: { userId_topicId: { userId, topicId } },
          create: { userId, topicId, order: index * 1000 },
          update: { order: index * 1000 },
        }),
      ),
    );

    return true;
  },

  async setMutedForUser({
    userId,
    circleId,
    topicId,
    isMuted,
  }: {
    userId?: string;
    circleId: string;
    topicId: string;
    isMuted: boolean;
  }) {
    if (!userId) return false;

    const isInCircle = await prismaClient.circle.isUserInCircle({
      userId,
      circleId,
    });

    if (!isInCircle) return false;

    const topic = await prismaClient.topic.findUnique({
      where: { id: topicId, circleId },
      select: { id: true },
    });

    if (!topic) return false;

    await prismaClient.topicPreference.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: { userId, topicId, isMuted },
      update: { isMuted },
    });

    return true;
  },
};
