import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useCallback, useMemo, useState } from "react";
import { User } from "@prisma/client";

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

export function useTopicNotifications({
  skipIncrementUnread = false,
}: {
  skipIncrementUnread?: boolean;
}) {
  const [notificationList, setNotificationList] = useState<TopicNotification[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const asOf = useMemo(() => new Date(), []);

  const clearUnreadNotifications = useCallback(() => {
    setUnreadCount(0);
  }, []);

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

    setNotificationList([newNotification, ...notificationList]);

    if (!skipIncrementUnread) {
      setUnreadCount((_count) => _count + 1);
    }
  });

  return useMemo(
    () => ({
      notificationList,
      unreadCount,
      clearUnreadNotifications,
      asOf,
    }),
    [notificationList, unreadCount, clearUnreadNotifications, asOf]
  );
}
