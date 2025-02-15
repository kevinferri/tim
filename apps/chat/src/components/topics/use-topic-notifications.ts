import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useCallback, useMemo } from "react";
import { User } from "@prisma/client";
import { useLocalStorage } from "@/lib/hooks";
import { useSelf } from "@/components/auth/self-provider";

type NotificationActor = Pick<User, "id" | "name" | "imageUrl">;

export type TopicNotification = {
  messageId: string;
  type: TopicNotificationType;
  actor: NotificationActor;
};

export enum TopicNotificationType {
  HighlightRecieved = "highlight:recieved",
  HighlightRemoved = "highlight:removed",
  ImageExpanded = "image:expanded",
  ClickedLink = "link:clicked",
}

const NOTIFICATION_LIMIT = 20;

export function useTopicNotifications({
  topicId,
  skipIncrementUnread = false,
}: {
  topicId: string;
  skipIncrementUnread?: boolean;
}) {
  const self = useSelf();

  const [notificationList, setNotificationList] = useLocalStorage<
    TopicNotification[]
  >(`tim:topic-notifications-list:${self.id}:${topicId}`, []);

  const [unreadCount, setUnreadCount] = useLocalStorage<number>(
    `tim:topic-unread-notifications-count:${self.id}:${topicId}`,
    0
  );

  const clearUnreadNotifications = useCallback(() => {
    setUnreadCount(0);
  }, [setUnreadCount]);

  // Handle created notification
  useSocketHandler<{
    messageId: string;
    actor: NotificationActor;
    notificationType: TopicNotificationType;
  }>(SocketEvent.CreateNotification, (payload) => {
    const newNotification = {
      messageId: payload.messageId,
      type: payload.notificationType,
      actor: payload.actor,
    };

    setNotificationList((notifications) => {
      const updatedNotifications = [...notifications];

      if (updatedNotifications.length >= NOTIFICATION_LIMIT) {
        updatedNotifications.shift();
      }

      return [...updatedNotifications, newNotification];
    });

    if (!skipIncrementUnread) {
      setUnreadCount((_count) => _count + 1);
    }
  });

  return useMemo(
    () => ({
      notificationList,
      unreadCount,
      clearUnreadNotifications,
    }),
    [notificationList, unreadCount, clearUnreadNotifications]
  );
}
