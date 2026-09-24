import { useInfiniteQuery } from "@tanstack/react-query";
import {
  notificationsQueryKey,
  NotificationItem,
} from "@/components/notifications/notification-query-cache";

const NOTIFICATION_LIMIT = 30;

async function fetchNotificationsPage(before?: string) {
  const resp = await fetch(
    `/api/notifications${before ? `?before=${before}` : ""}`,
  );

  if (!resp.ok) {
    throw new Error(`Request failed with status ${resp.status}`);
  }

  return (await resp.json()) as NotificationItem[];
}

export function useNotifications() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: notificationsQueryKey,
      queryFn: ({ pageParam }) => fetchNotificationsPage(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.length >= NOTIFICATION_LIMIT
          ? lastPage[lastPage.length - 1].createdAt
          : undefined,
    });

  const notifications = data?.pages.flat() ?? [];

  return {
    notifications,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    isLoading,
  };
}
