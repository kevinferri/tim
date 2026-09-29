"use client";

import { useState } from "react";
import Link from "next/link";
import { getDisplayName } from "@tim/user-display";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { useDateFormatter } from "@/lib/hooks/use-date-formatter";
import { useNotifications } from "@/components/notifications/use-notifications";
import { notificationCopyMap } from "@/components/notifications/notification-copy";
import { NotificationItem } from "@/components/notifications/notification-query-cache";
import { getThumbnail } from "@/components/topics/reply-preview";
import {
  useTopicMetaContext,
  useTopicUiContext,
} from "@/components/topics/current-topic-provider";

// A snapshot, not a live message: the row links to the real one, so it
// doesn't need to track later edits or highlight counts.
function MessageSnippet({
  text,
  mediaUrl,
}: {
  text: string | null;
  mediaUrl: string | null;
}) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const thumbnail = getThumbnail(text ?? "", mediaUrl);
  const showThumbnail = !!thumbnail && !thumbnailFailed;

  if (!text && !showThumbnail) return null;

  return (
    <div className="flex min-w-0 items-start gap-1.5 border-l-2 border-muted-foreground/25 pl-2 text-sm text-muted-foreground">
      {showThumbnail && (
        <img
          src={thumbnail}
          alt=""
          aria-hidden
          onError={() => setThumbnailFailed(true)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-sm object-cover"
        />
      )}
      {text && <span className="line-clamp-2 break-words">{text}</span>}
    </div>
  );
}

function NotificationRow({ notification }: { notification: NotificationItem }) {
  const { topicId: currentTopicId } = useTopicMetaContext();
  const { jumpToMessage } = useTopicUiContext();
  const createdAt = useDateFormatter(new Date(notification.createdAt));
  const copy = notificationCopyMap[notification.type];
  const { topicId, topic } = notification.message;

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
        <div className="text-sm text-primary mt-[-2px] flex items-center gap-1">
          {copy.icon}
          {getDisplayName(notification.actor.name)} {copy.text}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">#{topic.name}</span>
          {createdAt && <span>· {createdAt}</span>}
        </div>
        <MessageSnippet
          text={notification.message.text}
          mediaUrl={notification.message.mediaUrl}
        />
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
        <Button
          variant="ghost"
          size="sm"
          className="mx-3 mb-2"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
