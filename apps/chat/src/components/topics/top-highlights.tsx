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
      {topHighlights.map((message: MessageProps, i) => {
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
    </>
  );
}
