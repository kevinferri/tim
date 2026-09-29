"use client";

import { createContext, useContext } from "react";
import { NotificationItem } from "@/components/notifications/notification-query-cache";

type InitialNotificationsData = {
  notifications: NotificationItem[];
  unreadCount: number;
};

const NotificationsInitialDataContext = createContext<
  InitialNotificationsData | undefined
>(undefined);

// Holds the SSR'd first page + unread count (fetched once in LoggedInLayout,
// not per-topic-page) so useNotifications/useUnreadNotificationCount can seed
// their queries with initialData instead of showing a loading flash on mount.
export function NotificationsProvider({
  children,
  notifications,
  unreadCount,
}: {
  children: React.ReactNode;
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  return (
    <NotificationsInitialDataContext.Provider
      value={{ notifications, unreadCount }}
    >
      {children}
    </NotificationsInitialDataContext.Provider>
  );
}

export function useInitialNotificationsData() {
  const context = useContext(NotificationsInitialDataContext);

  if (!context) {
    throw new Error(
      "useInitialNotificationsData must be used inside NotificationsProvider",
    );
  }

  return context;
}
