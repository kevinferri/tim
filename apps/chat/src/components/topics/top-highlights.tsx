"use client";

import { useCurrentTopicContext } from "@/components/topics/current-topic-provider";
import { Message, MessageProps } from "@/components/topics/message";

export function TopHighlights() {
  const { topHighlights } = useCurrentTopicContext();

  return (
    <>
      {topHighlights.map((message: MessageProps) => {
        return <Message key={message.id} {...message} variant="minimal" />;
      })}
    </>
  );
}
