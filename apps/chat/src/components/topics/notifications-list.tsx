"use client";

import { useMemo } from "react";
import { useQueryState } from "nuqs";
import keyBy from "lodash.keyby";
import {
  Link2Icon,
  MagnifyingGlassIcon,
  StarFilledIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentTopicContext } from "@/components/topics/current-topic-provider";
import { Message } from "@/components/topics/message";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  TopicNotification,
  TopicNotificationType,
} from "@/components/topics/use-topic-notifications";

type Props = {
  notifications: TopicNotification[];
};

const copyMap = {
  [TopicNotificationType.HighlightRecieved]: {
    text: "highlighted your message",
    icon: <StarFilledIcon />,
  },
  [TopicNotificationType.HighlightRemoved]: {
    text: "removed a highlight",
    icon: <StarIcon />,
  },
  [TopicNotificationType.ImageExpanded]: {
    text: "expanded your image",
    icon: <MagnifyingGlassIcon />,
  },
  [TopicNotificationType.ClickedLink]: {
    text: "clicked your link",
    icon: <Link2Icon />,
  },
};

export function NotificationsList(props: Props) {
  const [_, setMessageId] = useQueryState("messageId");
  const { messages, topHighlights, mediaMessages, topicId } =
    useCurrentTopicContext();

  const messagesById = useMemo(
    () => keyBy([...messages, ...topHighlights, ...mediaMessages], "id"),
    [messages, topHighlights, mediaMessages]
  );

  return (
    <ScrollArea className="h-full">
      {props.notifications.map((notification: TopicNotification, idx) => {
        const message = messagesById[notification.messageId];

        return (
          <div
            key={`${notification.messageId}-${notification.actor.id}-${idx}`}
          >
            <div className="flex gap-3 p-3 items-start">
              <div className="flex">
                <UserAvatar
                  {...notification.actor}
                  topicId={topicId}
                  showStatus={false}
                />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <div className="text-sm text-muted-foreground mt-[-2px] flex items-center gap-1">
                  {copyMap[notification.type].icon}
                  {notification.actor.name?.split(" ")[0]}{" "}
                  {copyMap[notification.type].text}
                </div>
                <Card>
                  {message ? (
                    <CardContent className="p-0 m-0">
                      <Message
                        {...message}
                        variant="minimal"
                        className="hover:bg-inherit"
                        hiddenElements={["sentBy", "sentAt"]}
                      />
                    </CardContent>
                  ) : (
                    <CardContent className="p-3 m-0">
                      <span
                        onClick={() => {
                          setMessageId(notification.messageId);
                        }}
                        className="cursor-pointer underline text-purple-700 dark:text-purple-500 underline-offset-4 hover:opacity-80"
                      >
                        See message
                      </span>
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </div>
        );
      })}
    </ScrollArea>
  );
}
