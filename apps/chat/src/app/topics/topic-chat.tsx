"use client";

import { useEffect, useRef } from "react";

import { EmitEvent, useSocketEmit } from "@/components/socket/use-socket";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, MessageProps } from "@/topics/message";
import { useMessages } from "./use-messages";

type Props = {
  topicId: string;
  circleId: string;
  existingMessages: MessageProps[];
};

export function TopicChat({ topicId, circleId, existingMessages }: Props) {
  const joinRoom = useSocketEmit(EmitEvent.JoinRoom);
  const leaveRoom = useSocketEmit(EmitEvent.LeaveRoom);
  const scrollRef = useRef<null | HTMLDivElement>(null);
  const messages = useMessages(existingMessages);

  useEffect(() => {
    scrollRef?.current?.scrollIntoView();
  }, [messages.length]);

  useEffect(() => {
    joinRoom.emit({ id: topicId, roomType: "topic" });
    joinRoom.emit({ id: circleId, roomType: "circle" });

    return () => {
      leaveRoom.emit({ topicId });
      leaveRoom.emit({ circleId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollArea className="flex flex-col basis-full">
      {messages.map((message: MessageProps) => {
        return (
          <Message
            key={message.id}
            id={message.id}
            text={message.text}
            sentBy={message.sentBy}
            createdAt={message.createdAt}
            highlights={message.highlights}
          />
        );
      })}
      <div ref={scrollRef} />
    </ScrollArea>
  );
}
