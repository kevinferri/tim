"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getCircleIdForTopic } from "@/components/dashboard/active-circle-members-store";
import { NotificationType } from "@tim/socket-types";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import {
  HighlightAddedPayload,
  HighlightRemovedPayload,
  withHighlightAdded,
  withHighlightRemoved,
} from "@/components/topics/provider/topic-query-cache";
import { playHighlightChime } from "@/lib/sounds";
import { bumpTitleBadge } from "@/lib/title-badges";
import {
  notificationsQueryKey,
  unreadNotificationCountQueryKey,
  updateNotificationMessages,
} from "@/components/notifications/notification-query-cache";

// Mount exactly once inside SocketProvider -- rendering this component
// itself more than once would invalidate on every CreateNotification twice.
// (useSocketHandler itself is fine with multiple independent listeners for
// the same event -- socket.io calls every registered one, it's not a
// single-subscriber API. TopicSideBar also listens for this event, to
// re-run markAllRead while its own tab is open.)
// The live payload doesn't carry the notification's id/createdAt/readAt, so
// it can't be spliced into the cache directly -- invalidate and let both
// queries refetch instead.
export function NotificationSync() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    queryClient.invalidateQueries({
      queryKey: unreadNotificationCountQueryKey,
    });
  };

  const { circleId: currentCircleId } = useParams<{ circleId?: string }>();

  const socket = useSocketHandler<{
    notificationType: NotificationType;
    topicId: string;
  }>(
    SocketEvent.CreateNotification,
    ({ notificationType, topicId }) => {
      invalidate();
      // Tab title/chime are "this circle needs you"; the sidebar list stays global.
      const inThisCircle =
        !!currentCircleId && getCircleIdForTopic(topicId) === currentCircleId;
      if (
        notificationType === NotificationType.HighlightRecieved &&
        inThisCircle
      ) {
        // Like the new-message sound: only when Tim isn't the window you're looking at.
        if (!document.hasFocus()) playHighlightChime();
        bumpTitleBadge("highlights");
      }
    },
  );

  // A circle-mate's browser pings after the chat app saved circle notifications (e.g. a game finish).
  useSocketHandler(SocketEvent.CircleNotificationsChanged, invalidate);

  // Only arrives for the topic you're in, or for your own toggles elsewhere --
  // other topics' notifications may lag, which is fine.
  useSocketHandler<HighlightAddedPayload>(
    SocketEvent.AddedHighlight,
    (payload) => {
      updateNotificationMessages(
        queryClient,
        payload.highlight.messageId,
        withHighlightAdded(payload),
      );
    },
  );

  useSocketHandler<HighlightRemovedPayload>(
    SocketEvent.RemovedHighlight,
    (payload) => {
      updateNotificationMessages(
        queryClient,
        payload.messageId,
        withHighlightRemoved(payload),
      );
    },
  );

  // Both queries use staleTime: Infinity, so notifications pushed while
  // disconnected would otherwise never show up.
  useEffect(() => {
    socket.io.on("reconnect", invalidate);
    return () => {
      socket.io.off("reconnect", invalidate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Circle notifications are written by the chat app, not the realtime server: scheduled
  // ones (Same Page alerts) have no live push, and a circle-mate's ping can be missed.
  useEffect(() => {
    let lastRefreshAt = Date.now();
    const onVisible = () => {
      if (document.hidden) return;
      if (Date.now() - lastRefreshAt < VISIBLE_REFRESH_MIN_INTERVAL_MS) return;
      lastRefreshAt = Date.now();
      invalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

const VISIBLE_REFRESH_MIN_INTERVAL_MS = 30_000;
