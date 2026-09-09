"use client";

import {
  getMessagePositionFlags,
  useTopicHighlightsContext,
  useTopicMessagesContext,
} from "@/components/topics/current-topic-provider";
import { Message, MessageProps } from "@/components/topics/message";

export function TopHighlights() {
  const { topHighlights } = useTopicHighlightsContext();
  const { recency } = useTopicMessagesContext();

  return (
    <>
      {topHighlights.map((message: MessageProps) => {
        return (
          <Message
            key={message.id}
            {...message}
            variant="minimal"
            {...getMessagePositionFlags(recency, message.id)}
          />
        );
      })}
    </>
  );
}
