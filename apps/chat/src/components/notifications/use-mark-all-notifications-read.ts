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
      // Reconciles the optimistic 0 against the server. Without this, a
      // notification that arrives (via the live socket push) concurrently
      // with this mutation can have already written the true count here --
      // the synchronous setQueryData above would then clobber it back to 0,
      // hiding a genuinely unread notification until something else
      // invalidates this query.
      queryClient.invalidateQueries({
        queryKey: unreadNotificationCountQueryKey,
      });

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
      // Same reconciliation as the count above: a concurrent
      // NotificationSync-triggered refetch of this same query, in flight
      // since before this mutation's server-side update ran, can resolve
      // and land stale (pre-mark-all-read) data after the optimistic write
      // above. Invalidating reconciles it against the server shortly after,
      // same as the count.
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });
}
