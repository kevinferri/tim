"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationType } from "@tim/socket-types";
import { Highlight, User } from "@prisma/client";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
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

  const socket = useSocketHandler<{ notificationType: NotificationType }>(
    SocketEvent.CreateNotification,
    ({ notificationType }) => {
      invalidate();
      if (notificationType === NotificationType.HighlightRecieved) {
        // Like the new-message sound: only when Tim isn't the window you're looking at.
        if (!document.hasFocus()) playHighlightChime();
        bumpTitleBadge("highlights");
      }
    },
  );

  // Only arrives for the topic you're in, or for your own toggles elsewhere --
  // other topics' notifications may lag, which is fine.
  useSocketHandler<{ highlight: Highlight; createdBy: User }>(
    SocketEvent.AddedHighlight,
    ({ highlight, createdBy }) => {
      updateNotificationMessages(queryClient, highlight.messageId, (m) => ({
        ...m,
        highlights: [
          ...(m.highlights ?? []),
          { id: highlight.id, userId: highlight.userId, createdBy },
        ],
      }));
    },
  );

  useSocketHandler<{ messageId: string; userId: string }>(
    SocketEvent.RemovedHighlight,
    ({ messageId, userId }) => {
      updateNotificationMessages(queryClient, messageId, (m) => ({
        ...m,
        highlights: (m.highlights ?? []).filter((h) => h.userId !== userId),
      }));
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

  return null;
}
