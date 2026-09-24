import { useInfiniteQuery } from "@tanstack/react-query";
import {
  notificationsQueryKey,
  NotificationItem,
} from "@/components/notifications/notification-query-cache";
import { useInitialNotificationsData } from "@/components/notifications/notifications-provider";

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
  const { notifications: initialNotifications } = useInitialNotificationsData();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: notificationsQueryKey,
      queryFn: ({ pageParam }) => fetchNotificationsPage(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.length >= NOTIFICATION_LIMIT
          ? lastPage[lastPage.length - 1].createdAt
          : undefined,
      // Seeded from LoggedInLayout's SSR fetch (not per-topic-page, since
      // notifications aren't topic data) -- avoids a loading flash on mount,
      // same pattern useTopicMessages uses for existingMessages.
      initialData: {
        pages: [initialNotifications],
        pageParams: [undefined],
      },
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
