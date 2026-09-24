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
