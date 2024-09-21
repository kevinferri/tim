"use client";

import { useState } from "react";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, MessageProps } from "@/components/topics/message";
import { useCurrentTopicContext } from "@/components/topics/current-topic-provider";
import { useEffectOnce } from "@/lib/hooks";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { InfiniteLoader } from "@/components/ui/infinite-loader";
import { Spinner } from "@/components/ui/spinner";
import { useUnreadTopics } from "../dashboard/unread-topics-store";

const SCROLL_TIMEOUT = 250;

export function TopicChat() {
  const joinRoom = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoom = useSocketEmit(SocketEvent.LeaveRoom);
  const [hasScrolled, setHasScrolled] = useState(false);
  const { markTopicAsRead } = useUnreadTopics();

  const {
    messages,
    topicId,
    scrollRef,
    messagesListRef,
    scrollToBottomOfChat,
    loadMoreMessages,
    loadingMoreMessages,
    hasMoreMessages,
  } = useCurrentTopicContext();

  const payload = { id: topicId, roomType: "topic" };

  useEffectOnce(() => {
    joinRoom.emit(payload);
    markTopicAsRead(topicId);
    scrollToBottomOfChat({ timeout: SCROLL_TIMEOUT, force: true });

    setTimeout(() => {
      setHasScrolled(true);
    }, SCROLL_TIMEOUT + 1);

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

        <div className="text-xl">No messages yet</div>

        <div className="text-muted-foreground text-base">
          Send a message to get the conversation going
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex flex-col basis-full" ref={messagesListRef}>
      {hasScrolled && hasMoreMessages && (
        <InfiniteLoader
          loading={loadingMoreMessages}
          fetchNextPage={loadMoreMessages}
          containerRef={messagesListRef}
        >
          <div className="flex flex-col items-center p-2">
            <Spinner />
          </div>
        </InfiniteLoader>
      )}

      {messages.map((message: MessageProps) => {
        return (
          <Message
            key={message.id}
            {...message}
            context="topic"
            className={!hasScrolled ? "invisible" : ""}
          />
        );
      })}

      <div ref={scrollRef} />
    </ScrollArea>
  );
}
