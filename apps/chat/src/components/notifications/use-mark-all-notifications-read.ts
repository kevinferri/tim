import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead } from "@/actions/notifications";
import {
  notificationsQueryKey,
  unreadNotificationCountQueryKey,
  NotificationItem,
} from "@/components/notifications/notification-query-cache";

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData(unreadNotificationCountQueryKey, 0);

      queryClient.setQueriesData<{ pages: NotificationItem[][] }>(
        { queryKey: notificationsQueryKey },
        (prev) => {
          if (!prev) return prev;

          const readAt = new Date().toISOString();
          return {
            ...prev,
            pages: prev.pages.map((page) =>
              page.map((n) => (n.readAt ? n : { ...n, readAt })),
            ),
          };
        },
      );
    },
  });
}
