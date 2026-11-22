"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  ImageIcon,
  PersonIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TopHighlights,
  TopHighlightsHeader,
} from "@/components/topics/top-highlights";
import { MediaList } from "@/components/topics/media-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CircleMembersList } from "@/components/topics/circle-members-list";
import { Badge } from "@/components/ui/badge";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { useUnreadNotificationCount } from "@/components/notifications/use-unread-notification-count";
import { useMarkAllNotificationsRead } from "@/components/notifications/use-mark-all-notifications-read";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { HEADER_ROW_HEIGHT } from "@/components/topics/header-row";
import { useTopicMetaContext } from "@/components/topics/current-topic-provider";
import { GameRoomButton } from "@/games";
import { NewsButton } from "@/components/news/news-button";
import { NAV_ICON_CIRCLE } from "@/lib/nav-icon";
import { cn } from "@/lib/utils";

type Tab = "highlights" | "media" | "members" | "notifications";

// Fills its whole slot as the click target. Only the icon presses: a button transform makes the underline jitter.
const NAV_BUTTON =
  "h-full w-auto flex-1 rounded-none p-0 text-muted-foreground hover:bg-transparent hover:text-foreground active:transform-none";

const TAB_LABELS: Record<Tab, string> = {
  members: "Circle members",
  highlights: "Top highlights",
  media: "Media",
  notifications: "Notifications",
};

export function TopicSideBar() {
  const { circleId } = useTopicMetaContext();
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

  // Refetches (tab visible again, scheduled refresh) raise the count without a socket event.
  useEffect(() => {
    if (activeTab === "notifications" && unreadCount > 0 && !isMarkingAllRead) {
      markAllRead();
    }
  }, [activeTab, unreadCount, isMarkingAllRead, markAllRead]);

  const tabMap: Record<Tab, Record<string, React.ReactElement | string>> = {
    members: {
      header: "Circle members",
      node: <CircleMembersList />,
      icon: <PersonIcon />,
    },
    highlights: {
      header: <TopHighlightsHeader />,
      node: <TopHighlights />,
      icon: <StarIcon />,
    },
    media: { header: "Media", node: <MediaList />, icon: <ImageIcon /> },
    notifications: {
      header: "Notifications",
      node: <NotificationPanel />,
      icon: (
        <div className="flex items-center gap-1.5">
          <BellIcon />
          {activeTab !== "notifications" && unreadCount > 0 && (
            <Badge className="flex font-normal text-xs rounded-xl hover:bg-purple-500 px-2 bg-purple-500 min-w-7 justify-center">
              {unreadCount}
            </Badge>
          )}
        </div>
      ),
    },
  } as const;

  const tabTrigger = (tab: Tab) => (
    <TabsTrigger
      value={tab}
      aria-label={TAB_LABELS[tab]}
      className={cn(
        NAV_BUTTON,
        "group relative",
        "data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
        // The selected tab's underline sits on the row's bottom border, tying it to the panel below.
        "after:absolute after:inset-x-2 after:-bottom-px after:h-px after:rounded-full data-[state=active]:after:bg-foreground",
      )}
    >
      <span className={NAV_ICON_CIRCLE}>{tabMap[tab].icon}</span>
    </TabsTrigger>
  );

  return (
    <div className="relative hidden w-sidebar-detail shrink-0 flex-col border-l bg-sidebar shadow-md md:flex lg:w-sidebar-detail-lg">
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
        {/* Fills the header cell; same height as the topic header so the lines meet. */}
        <div className={`flex shrink-0 border-b ${HEADER_ROW_HEIGHT}`}>
          {/* Each icon gets an equal slot across the row. */}
          <TabsList className="flex h-full w-full items-center rounded-none bg-transparent p-0">
            {tabTrigger("members")}
            {tabTrigger("highlights")}
            {tabTrigger("media")}
            {tabTrigger("notifications")}
            <RowDivider />
            <GameRoomButton
              circleId={circleId}
              placement="header"
              className={NAV_BUTTON}
            />
            <NewsButton
              circleId={circleId}
              placement="header"
              className={NAV_BUTTON}
            />
          </TabsList>
        </div>

        <div className="flex flex-1 flex-col overflow-y-hidden basis-full">
          {/* Same title style as the Game room and News drawers. No bottom padding: each list brings its own 12px top spacing. */}
          <div className="px-3 pt-3 text-center font-semibold">
            {tabMap[activeTab].header}
          </div>
          <ScrollArea>{tabMap[activeTab].node}</ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}

function RowDivider() {
  // A foreground tint, not bg-border, which nearly vanishes beside the icon circles.
  return (
    <div className="mx-0.5 h-5 w-px shrink-0 bg-foreground/20" aria-hidden />
  );
}
