import { useQuery } from "@tanstack/react-query";
import { unreadNotificationCountQueryKey } from "@/components/notifications/notification-query-cache";
import { useInitialNotificationsData } from "@/components/notifications/notifications-provider";

async function fetchUnreadCount() {
  const resp = await fetch("/api/notifications/unread-count");

  if (!resp.ok) {
    throw new Error(`Request failed with status ${resp.status}`);
  }

  const { count } = (await resp.json()) as { count: number };
  return count;
}

export function useUnreadNotificationCount() {
  const { unreadCount: initialUnreadCount } = useInitialNotificationsData();

  const { data } = useQuery({
    queryKey: unreadNotificationCountQueryKey,
    queryFn: fetchUnreadCount,
    initialData: initialUnreadCount,
  });

  return data ?? 0;
}
