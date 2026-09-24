import { useQuery } from "@tanstack/react-query";
import { unreadNotificationCountQueryKey } from "@/components/notifications/notification-query-cache";

async function fetchUnreadCount() {
  const resp = await fetch("/api/notifications/unread-count");

  if (!resp.ok) {
    throw new Error(`Request failed with status ${resp.status}`);
  }

  const { count } = (await resp.json()) as { count: number };
  return count;
}

export function useUnreadNotificationCount() {
  const { data } = useQuery({
    queryKey: unreadNotificationCountQueryKey,
    queryFn: fetchUnreadCount,
  });

  return data ?? 0;
}
