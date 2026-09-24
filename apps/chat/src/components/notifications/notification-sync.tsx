"use client";

import { useQueryClient } from "@tanstack/react-query";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import {
  notificationsQueryKey,
  unreadNotificationCountQueryKey,
} from "@/components/notifications/notification-query-cache";

// Mount exactly once inside SocketProvider -- useSocketHandler assumes a
// single subscriber per event. The live payload doesn't carry the
// notification's id/createdAt/readAt, so it can't be spliced into the
// cache directly -- invalidate and let both queries refetch instead.
export function NotificationSync() {
  const queryClient = useQueryClient();

  useSocketHandler(SocketEvent.CreateNotification, () => {
    queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    queryClient.invalidateQueries({
      queryKey: unreadNotificationCountQueryKey,
    });
  });

  return null;
}
