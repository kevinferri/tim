"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";
import { Message, MessageProps } from "@/topics/message";

function sanitize(messages: MessageProps[], limit: number) {
  return messages
    .sort((a, b) => {
      return (
        b.highlights.length - a.highlights.length ||
        Number(b.createdAt) - Number(a.createdAt)
      );
    })
    .slice(0, limit);
}

export function TopHighlights() {
  const { topHighlights, topHighlightsLimit } = useCurrentTopicContext();
  const toShow = useMemo(
    () => sanitize(topHighlights, topHighlightsLimit),
    [topHighlights, topHighlightsLimit]
  );

  return (
    <ScrollArea>
      {toShow.map((message: MessageProps) => {
        return <Message key={message.id} {...message} />;
      })}
    </ScrollArea>
  );
}
