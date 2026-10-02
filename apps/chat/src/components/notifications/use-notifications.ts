import { useInfiniteQuery } from "@tanstack/react-query";
import {
  notificationsQueryKey,
  NotificationItem,
} from "@/components/notifications/notification-query-cache";
import { useInitialNotificationsData } from "@/components/notifications/notifications-provider";
import { NOTIFICATION_LIMIT } from "@/lib/notification-constants";

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
      // The id of the last notification, not its createdAt -- see
      // notification-model.ts's getForUser for why.
      getNextPageParam: (lastPage) =>
        lastPage.length >= NOTIFICATION_LIMIT
          ? lastPage[lastPage.length - 1].id
          : undefined,
      // Seeded from LoggedInLayout's SSR fetch (not per-topic-page, since
      // notifications aren't topic data) -- avoids a loading flash on mount,
      // same pattern useTopicMessages uses for existingMessages.
      // NotificationSync invalidates on every new notification, so there's no
      // need to refetch each time the panel remounts (i.e. on every tab open).
      staleTime: Infinity,
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
