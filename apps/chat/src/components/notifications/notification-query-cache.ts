import { InfiniteData, QueryClient } from "@tanstack/react-query";
import { NotificationType } from "@tim/socket-types";
import type { MessageData } from "@/components/topics/message";

export type NotificationActor = {
  id: string;
  name: string | null;
  displayName: string;
  imageUrl: string | null;
};

export type NotificationMessage = MessageData & {
  id: string;
  topicId: string;
  topic: { id: string; name: string; circleId: string };
};

// Message notifications have a message and actor; circle-level ones (games) have a circle instead.
export type NotificationItem = {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  messageId: string | null;
  actor: NotificationActor | null;
  message: NotificationMessage | null;
  circle: { id: string; name: string } | null;
};

export const notificationsQueryKey = ["notifications"];
export const unreadNotificationCountQueryKey = [
  "notifications",
  "unread-count",
];

// Marks every not-yet-read notification as read as of `readAt`, leaving
// already-read ones untouched (so a genuinely earlier readAt isn't
// overwritten by a later mark-all-read call).
export function withAllRead(readAt: string) {
  return (n: NotificationItem): NotificationItem =>
    n.readAt ? n : { ...n, readAt };
}

// Several notifications can point at the same message; patches every copy.
export function updateNotificationMessages(
  queryClient: QueryClient,
  messageId: string,
  updater: (prev: NotificationMessage) => NotificationMessage,
) {
  queryClient.setQueryData<InfiniteData<NotificationItem[]>>(
    notificationsQueryKey,
    (prev) =>
      prev && {
        ...prev,
        pages: prev.pages.map((page) =>
          page.map((n) =>
            n.message && n.messageId === messageId
              ? { ...n, message: updater(n.message) }
              : n,
          ),
        ),
      },
  );
}

// Exact key: ["notifications"] is also a prefix of the unread-count key.
export function updateNotificationActorsAndMessages(
  queryClient: QueryClient,
  userId: string,
  update: {
    actor: Partial<NotificationActor>;
    message: (prev: NotificationMessage) => NotificationMessage;
  },
) {
  queryClient.setQueryData<InfiniteData<NotificationItem[]>>(
    notificationsQueryKey,
    (prev) =>
      prev && {
        ...prev,
        pages: prev.pages.map((page) =>
          page.map((n) => ({
            ...n,
            actor:
              n.actor?.id === userId
                ? { ...n.actor, ...update.actor }
                : n.actor,
            message: n.message && update.message(n.message),
          })),
        ),
      },
  );
}
