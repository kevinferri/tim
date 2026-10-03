"use client";

import Link from "next/link";
import { getDisplayName } from "@tim/user-display";
import { UserAvatar } from "@/components/ui/user-avatar";
import { InfiniteLoader } from "@/components/ui/infinite-loader";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/lib/hooks/use-now";
import { formatFeedTime, formatFullDateTime } from "@/lib/relative-time";
import { useNotifications } from "@/components/notifications/use-notifications";
import { notificationCopyMap } from "@/components/notifications/notification-copy";
import { NotificationItem } from "@/components/notifications/notification-query-cache";
import { Message } from "@/components/topics/message";
import {
  useTopicMetaContext,
  useTopicUiContext,
} from "@/components/topics/current-topic-provider";

function NotificationRow({ notification }: { notification: NotificationItem }) {
  const { topicId: currentTopicId } = useTopicMetaContext();
  const { jumpToMessage } = useTopicUiContext();
  const now = useNow();
  const createdAt = new Date(notification.createdAt);
  const copy = notificationCopyMap[notification.type];
  const { topicId, topic } = notification.message;

  return (
    <div className="border-b">
      {/* The header links to the message in its topic; the message itself is live. */}
      <Link
        href={`/circles/${topic.circleId}/topics/${topicId}?jumpTo=${notification.messageId}`}
        onClick={(e) => {
          if (topicId !== currentTopicId) return;

          // Already in the topic: scroll to it in the transcript instead.
          e.preventDefault();
          jumpToMessage(notification.messageId, "topic");
        }}
        className="flex items-start gap-2 px-3 pt-3 text-sm text-muted-foreground hover:text-foreground"
      >
        <UserAvatar
          {...notification.actor}
          size="xs"
          showStatus={false}
          status={null}
          lastStatusUpdate={null}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* Plain inline flow, so a wrapped header continues under the icon. */}
          <div className="break-words">
            <span className="mr-1 inline-block align-[-2px]">{copy.icon}</span>
            {getDisplayName(notification.actor.name)} {copy.text}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="truncate">#{topic.name}</span>
            {now !== null && (
              <time
                dateTime={notification.createdAt}
                title={formatFullDateTime(createdAt)}
                className="shrink-0"
              >
                · {formatFeedTime(createdAt, new Date(now))}
              </time>
            )}
          </div>
        </div>
      </Link>
      <Message {...notification.message} context="notification" />
    </div>
  );
}

export function NotificationPanel() {
  const {
    notifications,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useNotifications();

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No notifications yet
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} />
      ))}
      {hasNextPage && (
        <InfiniteLoader
          loading={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        >
          <div className="flex justify-center p-3">
            <Spinner />
          </div>
        </InfiniteLoader>
      )}
    </div>
  );
}
