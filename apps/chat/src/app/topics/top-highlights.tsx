"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";
import { Message, MessageProps } from "@/topics/message";

export function TopHighlights() {
  const { topHighlights } = useCurrentTopicContext();

  // Need to stay sorted after client updates
  const sorted = useMemo(
    () =>
      topHighlights.sort((a, b) => {
        return (
          b.highlights.length - a.highlights.length ||
          Number(b.createdAt) - Number(a.createdAt)
        );
      }),
    [topHighlights]
  );

  return (
    <ScrollArea>
      {sorted.map((message: MessageProps) => {
        return <Message key={message.id} {...message} />;
      })}
    </ScrollArea>
  );
}
