"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { InfiniteLoader } from "@/components/ui/infinite-loader";
import { Spinner } from "@/components/ui/spinner";
import { useNow } from "@/lib/hooks/use-now";
import { formatFeedTime, formatFullDateTime } from "@/lib/relative-time";
import { useNotifications } from "@/components/notifications/use-notifications";
import { notificationCopyMap } from "@/components/notifications/notification-copy";
import {
  NotificationActor,
  NotificationItem,
  NotificationMessage,
} from "@/components/notifications/notification-query-cache";
import { Message } from "@/components/topics/message";
import {
  useTopicMetaContext,
  useTopicUiContext,
} from "@/components/topics/current-topic-provider";

type MessageNotification = NotificationItem & {
  messageId: string;
  actor: NotificationActor;
  message: NotificationMessage;
};

function isMessageNotification(n: NotificationItem): n is MessageNotification {
  return n.message !== null && n.actor !== null && n.messageId !== null;
}

function NotificationTime({ createdAt }: { createdAt: string }) {
  const now = useNow();
  if (now === null) return null;
  const date = new Date(createdAt);

  return (
    <time
      dateTime={createdAt}
      title={formatFullDateTime(date)}
      className="shrink-0"
    >
      · {formatFeedTime(date, new Date(now))}
    </time>
  );
}

// Circle-level notification (e.g. a game) with no message to preview.
function CircleNotificationRow({
  notification,
  circle,
}: {
  notification: NotificationItem;
  circle: { id: string; name: string };
}) {
  const copy = notificationCopyMap[notification.type];
  const pathname = usePathname();

  return (
    <Link
      href={`/circles/${circle.id}`}
      onClick={(e) => {
        copy.onOpen?.(circle.id);
        // Already in this circle: stay on the current topic.
        if (pathname.startsWith(`/circles/${circle.id}/`)) e.preventDefault();
      }}
      className="flex items-start gap-2 border-b px-3 py-3 text-sm text-muted-foreground hover:text-foreground"
    >
      <span className="mt-0.5 shrink-0">{copy.icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="break-words">{copy.text}</div>
        <div className="flex items-center gap-1 text-xs">
          <span className="truncate">{circle.name}</span>
          <NotificationTime createdAt={notification.createdAt} />
        </div>
      </div>
    </Link>
  );
}

function NotificationRow({
  notification,
}: {
  notification: MessageNotification;
}) {
  const { topicId: currentTopicId } = useTopicMetaContext();
  const { jumpToMessage } = useTopicUiContext();
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
            {notification.actor.displayName} {copy.text}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="truncate">#{topic.name}</span>
            <NotificationTime createdAt={notification.createdAt} />
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
      {notifications.map((notification) =>
        isMessageNotification(notification) ? (
          <NotificationRow key={notification.id} notification={notification} />
        ) : notification.circle ? (
          <CircleNotificationRow
            key={notification.id}
            notification={notification}
            circle={notification.circle}
          />
        ) : null,
      )}
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
