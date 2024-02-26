"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EmitEvent,
  HandlerEvent,
  useSocketEmit,
  useSocketHandler,
} from "@/components/socket/use-socket";
import { ScrollArea } from "@/components/ui/scroll-area";

type ProcessedMessage = {
  text: string;
  sentBy: string;
};

export function TopicChat({ topicId }: { topicId: string }) {
  const [messages, setMessages] = useState<ProcessedMessage[]>([]);
  const joinRoom = useSocketEmit(EmitEvent.JoinRoom);
  const leaveRoom = useSocketEmit(EmitEvent.LeaveRoom);

  const messageProcessedHandler = useCallback(
    (newMessage: ProcessedMessage) => {
      console.log(newMessage);
      setMessages([...messages, newMessage]);
    },
    [messages]
  );

  useEffect(() => {
    joinRoom.emit({ topicId });

    return () => {
      leaveRoom.emit({ topicId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSocketHandler<ProcessedMessage>(
    HandlerEvent.MessageProcessed,
    messageProcessedHandler
  );

  return (
    <ScrollArea className="flex flex-col basis-full overflow-y-scroll">
      {messages.map((message: ProcessedMessage) => {
        return (
          <div key={message.text}>
            {message.sentBy}: {message.text}
          </div>
        );
      })}
    </ScrollArea>
  );
}
