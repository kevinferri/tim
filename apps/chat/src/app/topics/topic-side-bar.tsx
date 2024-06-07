"use client";

import {
  BellIcon,
  ImageIcon,
  PersonIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopHighlights } from "@/topics/top-highlights";
import { MediaList } from "@/topics/media-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CircleMembersList } from "@/topics/circle-members-list";
import { ReactNode, useState } from "react";

type Tab = "highlights" | "media" | "members" | "notifications";

const tabMap: Record<Tab, Record<string, React.ReactElement | string>> = {
  highlights: {
    header: "Top highlights",
    node: <TopHighlights />,
    icon: <StarIcon />,
  },
  media: { header: "Media", node: <MediaList />, icon: <ImageIcon /> },
  members: {
    header: "Circle members",
    node: <CircleMembersList />,
    icon: <PersonIcon />,
  },
  notifications: {
    header: "Notifications",
    node: <div>Notifications here</div>,
    icon: <BellIcon />,
  },
} as const;

export function TopicSideBar() {
  const [activeTab, setActiveTab] = useState<Tab>("highlights");

  return (
    <Tabs
      defaultValue="highlights"
      className="flex flex-col shadow-md border-l max-w-[340px] min-w-[340px]"
      onValueChange={(tab) => {
        setActiveTab(tab as Tab);
      }}
    >
      <div className="p-3">
        <TabsList className="grid w-full grid-cols-4">
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
        <div className="text-center pb-3">{tabMap[activeTab].header}</div>
        <ScrollArea>{tabMap[activeTab].node}</ScrollArea>
      </div>
    </Tabs>
  );
}
