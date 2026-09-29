import { prismaClient } from "@/lib/prisma/client";
import { NOTIFICATION_LIMIT } from "@/components/notifications/notification-query-cache";

export const notificationModel = {
  async getForUser({ userId, before }: { userId?: string; before?: string }) {
    if (!userId) return [];

    // Cursor is the previous page's last notification id, not its createdAt --
    // createdAt alone can tie (e.g. one message mentioning several people
    // creates several notifications within the same millisecond via
    // Promise.all), and a value-based `createdAt < before` cursor would
    // silently skip any tied rows that didn't make it into the prior page.
    // Prisma's id-based cursor is positional, not value-based, so it's exact
    // regardless of ties.
    return await prismaClient.notification.findMany({
      where: { recipientId: userId },
      take: NOTIFICATION_LIMIT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
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
