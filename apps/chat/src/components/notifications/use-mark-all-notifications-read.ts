import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead } from "@/actions/notifications";
import {
  notificationsQueryKey,
  unreadNotificationCountQueryKey,
  NotificationItem,
  withAllRead,
} from "@/components/notifications/notification-query-cache";

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData(unreadNotificationCountQueryKey, 0);

      // setQueryData (exact key), not setQueriesData -- notificationsQueryKey
      // is a prefix of unreadNotificationCountQueryKey, so a partial-match
      // update here would also hit the count query above.
      queryClient.setQueryData<{ pages: NotificationItem[][] }>(
        notificationsQueryKey,
        (prev) => {
          if (!prev) return prev;

          const mark = withAllRead(new Date().toISOString());
          return {
            ...prev,
            pages: prev.pages.map((page) => page.map(mark)),
          };
        },
      );
    },
  });
}
