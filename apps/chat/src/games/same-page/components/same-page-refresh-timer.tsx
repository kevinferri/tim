"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationsQueryKey } from "@/components/notifications/notification-query-cache";
import { gameRoomBadgeQueryKey } from "@/games/game-room";
import { getNextAlertAt } from "../lib/est-day";
import { samePageQueryKey } from "./api";

// Spread tabs out and give the server's cron run time to finish first.
const MIN_DELAY_MS = 30_000;
const MAX_EXTRA_DELAY_MS = 60_000;

/**
 * Same Page alerts are saved server-side with no live push, so open tabs
 * refetch just after each scheduled alert time. Mount once.
 */
export function SamePageRefreshTimer() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      clearTimeout(timer);
      const delay =
        getNextAlertAt().getTime() -
        Date.now() +
        MIN_DELAY_MS +
        Math.random() * MAX_EXTRA_DELAY_MS;

      timer = setTimeout(() => {
        // Prefix match: also refreshes the unread count.
        queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
        queryClient.invalidateQueries({ queryKey: gameRoomBadgeQueryKey() });
        queryClient.invalidateQueries({ queryKey: samePageQueryKey() });
        schedule();
      }, delay);
    };

    schedule();
    // Timers don't fire on time while a laptop sleeps, so reschedule on return.
    const onVisible = () => {
      if (!document.hidden) schedule();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [queryClient]);

  return null;
}
