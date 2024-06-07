"use client";

import { useEffect } from "react";

import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, MessageProps } from "@/topics/message";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";
import { useEffectOnce, usePrevious } from "@/lib/hooks";

export function TopicChat() {
  const joinRoom = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoom = useSocketEmit(SocketEvent.LeaveRoom);
  const { messages, topicId, scrollRef, scrollToBottomOfChat } =
    useCurrentTopicContext();
  const prevMessagesLength = usePrevious(messages.length) ?? 0;

  useEffect(() => {
    if (prevMessagesLength < messages.length) {
      scrollToBottomOfChat();
    }
  }, [messages.length, prevMessagesLength, scrollToBottomOfChat]);

  useEffectOnce(() => {
    const payload = { id: topicId, roomType: "topic" };

    joinRoom.emit(payload);
    scrollToBottomOfChat(100);

    return () => {
      leaveRoom.emit(payload);
    };
  });

  return (
    <ScrollArea className="flex flex-col basis-full">
      {messages.map((message: MessageProps) => {
        return <Message key={message.id} {...message} />;
      })}
      <div ref={scrollRef} />
    </ScrollArea>
  );
}
