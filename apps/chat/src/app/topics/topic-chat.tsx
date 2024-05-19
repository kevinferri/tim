"use client";

import { useEffect } from "react";

import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, MessageProps } from "@/topics/message";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";

export function TopicChat() {
  const joinRoom = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoom = useSocketEmit(SocketEvent.LeaveRoom);
  const { messages, topicId, circleId, scrollRef, scrollToBottomOfChat } =
    useCurrentTopicContext();

  useEffect(() => {
    scrollToBottomOfChat();
  }, [messages.length, scrollToBottomOfChat]);

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
        return <Message key={message.id} {...message} />;
      })}
      <div ref={scrollRef} />
    </ScrollArea>
  );
}
