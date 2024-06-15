"use client";

import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, MessageProps } from "@/topics/message";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";
import { useEffectOnce } from "@/lib/hooks";
import { EnvelopeClosedIcon, EnvelopeOpenIcon } from "@radix-ui/react-icons";

export function TopicChat() {
  const joinRoom = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoom = useSocketEmit(SocketEvent.LeaveRoom);
  const { messages, topicId, scrollRef, scrollToBottomOfChat } =
    useCurrentTopicContext();

  useEffectOnce(() => {
    const payload = { id: topicId, roomType: "topic" };
    joinRoom.emit(payload);
    scrollToBottomOfChat(250);

    return () => {
      leaveRoom.emit(payload);
    };
  });

  if (messages.length === 0) {
    return (
      <div className="flex flex-col basis-full justify-center items-center gap-3 p-3 text-center">
        <div className="bg-secondary p-8 rounded-full border shadow-sm">
          <EnvelopeClosedIcon height={80} width={80} />
        </div>

        <div className="text-2xl">No messages yet</div>

        <div className="text-muted-foreground text-lg">
          Send a message to get the conversation going
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex flex-col basis-full">
      {messages.map((message: MessageProps) => {
        return <Message key={message.id} {...message} />;
      })}
      <div ref={scrollRef} />
    </ScrollArea>
  );
}
