"use client";

import { useState } from "react";
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
import { getThumbnail } from "@/components/topics/reply-preview";
import {
  useTopicMetaContext,
  useTopicUiContext,
} from "@/components/topics/current-topic-provider";

// Same inline thumbnail as ReplyPreview.
function Thumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      onError={() => setFailed(true)}
      className="mt-0.5 h-5 w-5 shrink-0 rounded-sm object-cover"
    />
  );
}

function NotificationRow({ notification }: { notification: NotificationItem }) {
  const { topicId: currentTopicId } = useTopicMetaContext();
  const { jumpToMessage } = useTopicUiContext();
  const now = useNow();
  const createdAt = new Date(notification.createdAt);
  const copy = notificationCopyMap[notification.type];
  const { topicId, topic, text, mediaUrl } = notification.message;
  const thumbnail = getThumbnail(text ?? "", mediaUrl);

  return (
    <Link
      href={`/circles/${topic.circleId}/topics/${topicId}?jumpTo=${notification.messageId}`}
      onClick={(e) => {
        if (topicId !== currentTopicId) return;

        // Already in the topic: scroll to it in the transcript instead.
        e.preventDefault();
        jumpToMessage(notification.messageId, "topic");
      }}
      className="flex gap-3 p-3 items-start hover:bg-accent"
    >
      <div className="flex">
        <UserAvatar
          {...notification.actor}
          showStatus={false}
          status={null}
          lastStatusUpdate={null}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1 w-full">
        {/* Plain inline flow, so a wrapped header continues under the icon. */}
        <div className="mt-[-2px] break-words text-sm text-muted-foreground">
          <span className="mr-1 inline-block align-[-2px]">{copy.icon}</span>
          {getDisplayName(notification.actor.name)} {copy.text}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
        {/* A snapshot, not a live message: the row links to the real one. */}
        {(text || thumbnail) && (
          <div className="flex min-w-0 items-start gap-1.5 text-sm text-primary">
            {thumbnail && <Thumbnail key={thumbnail} src={thumbnail} />}
            {text && <span className="line-clamp-2 break-words">{text}</span>}
          </div>
        )}
      </div>
    </Link>
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
