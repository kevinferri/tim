import { prismaClient } from "@/lib/prisma/client";
import { NOTIFICATION_LIMIT } from "@/lib/notification-constants";
import {
  DEFAULT_MESSAGE_SELECT,
  normalizeMessages,
} from "@/lib/prisma/message-model";
import { NotificationType } from "@tim/socket-types";

// Skips notifications about a circle the user has since left, rather than
// surfacing (or counting toward the badge) a dead link -- same pattern as
// topicReadStateModel.getMostRecentlyReadForUser.
function forCurrentMember(userId: string) {
  return {
    message: {
      topic: { parentCircle: { members: { some: { id: userId } } } },
    },
  };
}

export const notificationModel = {
  // Mentions are only recorded as notifications (message text is encrypted), so counts start when those did.
  async countMentionsReceivedByUser({
    userId,
    circleId,
  }: {
    userId: string;
    circleId: string;
  }): Promise<number> {
    return await prismaClient.notification.count({
      where: {
        recipientId: userId,
        type: NotificationType.Mentioned,
        message: { topic: { circleId } },
      },
    });
  },

  async countMentionsSentByUser({
    userId,
    circleId,
  }: {
    userId: string;
    circleId: string;
  }): Promise<number> {
    return await prismaClient.notification.count({
      where: {
        actorId: userId,
        type: NotificationType.Mentioned,
        message: { topic: { circleId } },
      },
    });
  },

  async getForUser({ userId, before }: { userId?: string; before?: string }) {
    if (!userId) return [];

    // Cursor is the previous page's last notification id, not its createdAt --
    // createdAt alone can tie (e.g. one message mentioning several people
    // creates several notifications within the same millisecond via
    // Promise.all), and a value-based `createdAt < before` cursor would
    // silently skip any tied rows that didn't make it into the prior page.
    let cursorWhere;
    if (before) {
      // Resolved scoped to recipientId, not just by id -- Prisma's own
      // `cursor` option anchors on the unique field alone, ignoring `where`,
      // which would let a client pass someone else's (or a stale/deleted)
      // notification id and still get a page back positioned off it.
      const cursorRow = await prismaClient.notification.findFirst({
        where: { id: before, recipientId: userId, ...forCurrentMember(userId) },
        select: { createdAt: true, id: true },
      });

      // Unknown, deleted, or foreign cursor: nothing to page from.
      if (!cursorRow) return [];

      cursorWhere = {
        OR: [
          { createdAt: { lt: cursorRow.createdAt } },
          { createdAt: cursorRow.createdAt, id: { lt: cursorRow.id } },
        ],
      };
    }

    const notifications = await prismaClient.notification.findMany({
      where: {
        recipientId: userId,
        ...forCurrentMember(userId),
        ...cursorWhere,
      },
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
        // Same shape as the transcript's, so the panel renders a real <Message>.
        message: {
          select: {
            ...DEFAULT_MESSAGE_SELECT,
            topic: { select: { id: true, name: true, circleId: true } },
          },
        },
      },
    });

    const messages = normalizeMessages(notifications.map((n) => n.message));

    return notifications.map((n, i) => ({
      ...n,
      message: { ...messages[i], text: messages[i].text ?? null },
    }));
  },

  async getUnreadCount({ userId }: { userId?: string }) {
    if (!userId) return 0;

    return await prismaClient.notification.count({
      where: { recipientId: userId, readAt: null, ...forCurrentMember(userId) },
    });
  },

  async markAllReadForUser({ userId }: { userId?: string }) {
    if (!userId) return { count: 0 };

    // Same forCurrentMember scoping as the reads -- without it, a
    // left-circle notification (already excluded from getForUser/
    // getUnreadCount, so the user never actually saw it) would get marked
    // read anyway, and come back silently pre-read if they rejoin later.
    return await prismaClient.notification.updateMany({
      where: {
        recipientId: userId,
        readAt: null,
        ...forCurrentMember(userId),
      },
      data: { readAt: new Date() },
    });
  },
};
