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
      {/* Room for the first row's toolbar to straddle its top edge, as in the transcript. */}
      <div className="pt-3">
        {mediaMessages.map((message: MessageProps) => {
          return (
            <Message
              key={message.id}
              {...message}
              {...getMessagePositionFlags(recency, message.id)}
              isFirstMessage={false}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
