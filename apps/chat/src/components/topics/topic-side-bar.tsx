"use client";

import { useState } from "react";
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
import { NotificationsList } from "@/components/topics/notifications-list";
import { useTopicNotifications } from "@/components/topics/use-topic-notifications";
import { Badge } from "@/components/ui/badge";

type Tab = "highlights" | "media" | "members" | "notifications";

type Props = {
  topicId: string;
};

export function TopicSideBar(props: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const { notificationList, clearUnreadNotifications, unreadCount } =
    useTopicNotifications({
      topicId: props.topicId,
      skipIncrementUnread: activeTab === "notifications",
    });

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
      node: <NotificationsList notifications={notificationList} />,
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
    <Tabs
      defaultValue="members"
      className="flex flex-col shadow-md border-l hidden w-sidebar-detail lg:w-sidebar-detail-lg md:flex shrink-0"
      onValueChange={(tab) => {
        setActiveTab(tab as Tab);

        if (tab === "notifications") {
          clearUnreadNotifications();
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
  );
}
