"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";
import { Message, MessageProps } from "@/topics/message";

export function MediaList() {
  const { mediaMessages } = useCurrentTopicContext();

  return (
    <ScrollArea className="h-full">
      {mediaMessages.map((message: MessageProps) => {
        return <Message key={message.id} {...message} variant="minimal" />;
      })}
    </ScrollArea>
  );
}
