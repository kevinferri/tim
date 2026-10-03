"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getMessagePositionFlags,
  useTopicMediaContext,
  useTopicMessagesContext,
} from "@/components/topics/current-topic-provider";
import { Message, MessageProps } from "@/components/topics/message";

export function MediaList() {
  const { mediaMessages } = useTopicMediaContext();
  const { recency } = useTopicMessagesContext();

  return (
    <ScrollArea className="h-full">
      {mediaMessages.map((message: MessageProps, i) => {
        return (
          <Message
            key={message.id}
            {...message}
            {...getMessagePositionFlags(recency, message.id)}
            // Toolbar placement is relative to this list, not the transcript.
            isFirstMessage={i === 0}
          />
        );
      })}
    </ScrollArea>
  );
}
