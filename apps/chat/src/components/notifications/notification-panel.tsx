"use client";

import { useRouter } from "next/navigation";
import { getDisplayName } from "@tim/user-display";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDateFormatter } from "@/lib/hooks/use-date-formatter";
import { useNotifications } from "@/components/notifications/use-notifications";
import { notificationCopyMap } from "@/components/notifications/notification-copy";
import { NotificationItem } from "@/components/notifications/notification-query-cache";

type Props = {
  onNavigate?: () => void;
};

function NotificationRow({
  notification,
  onNavigate,
}: {
  notification: NotificationItem;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const createdAt = useDateFormatter(new Date(notification.createdAt));
  const copy = notificationCopyMap[notification.type];

  return (
    <button
      type="button"
      onClick={() => {
        const { circleId } = notification.message.topic;
        router.push(
          `/circles/${circleId}/topics/${notification.message.topicId}?messageId=${notification.messageId}`,
        );
        onNavigate?.();
      }}
      className={cn(
        "flex w-full items-start gap-3 rounded-md p-2 text-left hover:bg-accent",
        !notification.readAt && "bg-accent/50",
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={notification.actor.imageUrl ?? undefined} />
        <AvatarFallback>
          {getInitials(notification.actor.name ?? undefined)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-sm">
          {copy.icon}
          <span className="truncate">
            {getDisplayName(notification.actor.name)} {copy.text}
          </span>
        </div>
        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <span className="truncate">#{notification.message.topic.name}</span>
          {createdAt && <span>· {createdAt}</span>}
        </div>
      </div>
    </button>
  );
}

export function NotificationPanel(props: Props) {
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
    <div className="flex flex-col gap-1">
      {notifications.map((notification) => (
        <NotificationRow
          key={notification.id}
          notification={notification}
          onNavigate={props.onNavigate}
        />
      ))}
      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
