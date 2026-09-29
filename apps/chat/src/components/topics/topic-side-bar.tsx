"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  ImageIcon,
  PersonIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopHighlights } from "@/components/topics/top-highlights";
import { MediaList } from "@/components/topics/media-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CircleMembersList } from "@/components/topics/circle-members-list";
import { Badge } from "@/components/ui/badge";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { useUnreadNotificationCount } from "@/components/notifications/use-unread-notification-count";
import { useMarkAllNotificationsRead } from "@/components/notifications/use-mark-all-notifications-read";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";

type Tab = "highlights" | "media" | "members" | "notifications";

export function TopicSideBar() {
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const unreadCount = useUnreadNotificationCount();
  const { mutate: markAllRead, isPending: isMarkingAllRead } =
    useMarkAllNotificationsRead();

  // An event that arrives while a mark-read is already in flight can't just
  // be skipped -- if the in-flight mutation's server-side UPDATE already ran
  // by the time this new notification's row is inserted, nothing else would
  // ever catch it, leaving the badge stuck at 1 while the tab is open.
  // Queue it instead, and fire one more call once the current one settles.
  const hasQueuedMarkReadRef = useRef(false);

  // Mirrors the old localStorage hook's skipIncrementUnread: while this tab
  // is already open, a live notification shouldn't sit there bumping the
  // badge back up -- immediately mark it read too, the same as opening the
  // tab does, instead of letting it accumulate until the tab is switched
  // away and back. Coalesced via the queue above so a burst of several
  // close-together notifications doesn't pile up one mutation per event.
  useSocketHandler(SocketEvent.CreateNotification, () => {
    if (activeTab !== "notifications") return;

    if (isMarkingAllRead) {
      hasQueuedMarkReadRef.current = true;
      return;
    }

    markAllRead();
  });

  useEffect(() => {
    if (
      activeTab === "notifications" &&
      !isMarkingAllRead &&
      hasQueuedMarkReadRef.current
    ) {
      hasQueuedMarkReadRef.current = false;
      markAllRead();
    }
  }, [activeTab, isMarkingAllRead, markAllRead]);

  const tabMap: Record<Tab, Record<string, React.ReactElement | string>> = {
    members: {
      header: "Circle members",
      node: <CircleMembersList />,
      icon: <PersonIcon />,
    },
    highlights: {
      header: (
        <div className="flex items-center justify-center gap-1">
          <span>Top highlights</span>
          <span className="text-xs text-muted-foreground">(monthly)</span>
        </div>
      ),
      node: <TopHighlights />,
      icon: <StarIcon />,
    },
    media: { header: "Media", node: <MediaList />, icon: <ImageIcon /> },
    notifications: {
      header: "Notifications",
      node: <NotificationPanel />,
      icon: (
        <div className="flex items-center gap-1.5 w-fu">
          <BellIcon />
          {activeTab !== "notifications" && unreadCount > 0 && (
            <Badge className="flex font-normal text-xs rounded-xl hover:bg-success px-2 bg-purple-500 min-w-7 justify-center">
              {unreadCount}
            </Badge>
          )}
        </div>
      ),
    },
  } as const;

  return (
    <div className="relative hidden w-sidebar-detail shrink-0 flex-col border-l shadow-md md:flex lg:w-sidebar-detail-lg">
      <Tabs
        defaultValue="members"
        className="flex min-h-0 flex-1 flex-col"
        onValueChange={(tab) => {
          setActiveTab(tab as Tab);

          if (tab === "notifications" && unreadCount > 0) {
            markAllRead();
          }
        }}
      >
        <div className="p-3">
          <TabsList className="grid w-full grid-cols-4 h-[38px]">
            {Object.keys(tabMap).map((tabKey) => {
              return (
                <TabsTrigger key={tabKey} value={tabKey}>
                  {tabMap[tabKey as Tab].icon}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="flex flex-1 flex-col overflow-y-hidden basis-full">
          <div className="text-center py-1">{tabMap[activeTab].header}</div>
          <ScrollArea>{tabMap[activeTab].node}</ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}
