"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";
import { Message, MessageProps } from "@/topics/message";

export function TopHighlights() {
  const { topHighlights } = useCurrentTopicContext();

  return (
    <ScrollArea>
      {topHighlights.map((message: MessageProps) => {
        return <Message key={message.id} {...message} />;
      })}
    </ScrollArea>
  );
}
