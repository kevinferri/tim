"use client";

import { getDisplayName } from "@tim/user-display";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDateFormatter } from "@/lib/hooks/use-date-formatter";
import { useNotifications } from "@/components/notifications/use-notifications";
import { notificationCopyMap } from "@/components/notifications/notification-copy";
import { NotificationItem } from "@/components/notifications/notification-query-cache";
import { Message } from "@/components/topics/message";

// Same rendering the old localStorage-based notification list used --
// the real Message component, in a Card, variant="minimal" with
// sentBy/sentAt hidden since the row's own header line already says who.
// Unlike that old version, the message is never missing: it doesn't depend
// on the current topic's already-loaded cache, it comes decrypted straight
// off the notification itself (global, not topic-scoped), so there's no
// "See message" fallback case left to handle.
function NotificationRow({ notification }: { notification: NotificationItem }) {
  const createdAt = useDateFormatter(new Date(notification.createdAt));
  const copy = notificationCopyMap[notification.type];

  return (
    <div className="flex gap-3 p-3 items-start">
      <div className="flex">
        <UserAvatar
          {...notification.actor}
          topicId={notification.message.topicId}
          showStatus={false}
          status={null}
          lastStatusUpdate={null}
        />
      </div>
      <div className="flex flex-col gap-1 w-full">
        <div className="text-sm text-muted-foreground mt-[-2px] flex items-center gap-1">
          {copy.icon}
          {getDisplayName(notification.actor.name)} {copy.text}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">#{notification.message.topic.name}</span>
          {createdAt && <span>· {createdAt}</span>}
        </div>
        <Card>
          <CardContent className="p-0 m-0">
            <Message
              id={notification.messageId}
              topicId={notification.message.topicId}
              text={notification.message.text ?? undefined}
              mediaUrl={notification.message.mediaUrl}
              variant="minimal"
              className="hover:bg-inherit"
              hiddenElements={["sentBy", "sentAt"]}
            />
          </CardContent>
        </Card>
      </div>
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
