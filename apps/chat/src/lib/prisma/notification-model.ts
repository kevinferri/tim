import { prismaClient } from "@/lib/prisma/client";

export const NOTIFICATION_LIMIT = 30;

export const notificationModel = {
  async getForUser({ userId, before }: { userId?: string; before?: string }) {
    if (!userId) return [];

    const cursor = before ? { createdAt: { lt: before } } : undefined;

    return await prismaClient.notification.findMany({
      where: { recipientId: userId, ...cursor },
      take: NOTIFICATION_LIMIT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        type: true,
        createdAt: true,
        readAt: true,
        messageId: true,
        actor: {
          select: { id: true, name: true, imageUrl: true },
        },
        message: {
          select: {
            topicId: true,
            topic: { select: { id: true, name: true, circleId: true } },
          },
        },
      },
    });
  },

  async getUnreadCount({ userId }: { userId?: string }) {
    if (!userId) return 0;

    return await prismaClient.notification.count({
      where: { recipientId: userId, readAt: null },
    });
  },

  async markAllReadForUser({ userId }: { userId?: string }) {
    if (!userId) return { count: 0 };

    return await prismaClient.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
