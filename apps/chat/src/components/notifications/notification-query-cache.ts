import { NotificationType } from "@tim/socket-types";

export type NotificationActor = {
  id: string;
  name: string | null;
  imageUrl: string | null;
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  messageId: string;
  actor: NotificationActor;
  message: {
    topicId: string;
    topic: { id: string; name: string; circleId: string };
  };
};

export const notificationsQueryKey = ["notifications"];
export const unreadNotificationCountQueryKey = [
  "notifications",
  "unread-count",
];

// Single source of truth for both the server's `take` and the client's
// hasNextPage check -- imported by notification-model.ts too, so it can't
// drift between the two without a compile error.
export const NOTIFICATION_LIMIT = 30;

// Marks every not-yet-read notification as read as of `readAt`, leaving
// already-read ones untouched (so a genuinely earlier readAt isn't
// overwritten by a later mark-all-read call).
export function withAllRead(readAt: string) {
  return (n: NotificationItem): NotificationItem =>
    n.readAt ? n : { ...n, readAt };
}
