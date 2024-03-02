"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EmitEvent,
  HandlerEvent,
  useSocketEmit,
  useSocketHandler,
} from "@/components/socket/use-socket";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, MessageProps } from "./message";

export function TopicChat({
  topicId,
  prevMessages,
}: {
  topicId: string;
  prevMessages: MessageProps[];
}) {
  const [messages, setMessages] = useState<MessageProps[]>(prevMessages);
  const joinRoom = useSocketEmit(EmitEvent.JoinRoom);
  const leaveRoom = useSocketEmit(EmitEvent.LeaveRoom);

  const messageProcessedHandler = useCallback(
    (newMessage: MessageProps) => {
      setMessages([...messages, newMessage]);
    },
    [messages]
  );

  useEffect(() => {
    joinRoom.emit({ id: topicId, roomType: "topic" });

    return () => {
      leaveRoom.emit({ topicId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSocketHandler<MessageProps>(
    HandlerEvent.MessageProcessed,
    messageProcessedHandler
  );

  return (
    <ScrollArea className="flex flex-col basis-full p-3">
      <div className="flex flex-col gap-4">
        {messages.map((message: MessageProps) => {
          return (
            <Message
              key={message.id}
              id={message.id}
              text={message.text}
              sentBy={message.sentBy}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
