"use client";

import { useState } from "react";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { useCurrentTopicContext } from "./current-topic-provider";
import { useUnreadTopics } from "@/components/dashboard/unread-topics-store";
import { useRoomManagement } from "@/components/socket/use-current-user-rooms";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { Message, MessageProps } from "./message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfiniteLoader } from "@/components/ui/infinite-loader";
import { Spinner } from "@/components/ui/spinner";

const SCROLL_TIMEOUT = 500;

export function TopicChat() {
  const { markTopicAsRead } = useUnreadTopics();
  const { joinRoom, leaveRoom } = useRoomManagement();
  const [hasScrolled, setHasScrolled] = useState(false);

  const {
    topicId,
    scrollToBottomOfChat,
    blopSoundRef,
    messages,
    messagesListRef,
    scrollRef,
    loadMoreMessages,
    loadingMoreMessages,
    hasMoreMessages,
  } = useCurrentTopicContext();

  useEffectOnce(() => {
    joinRoom(topicId, "topic");
    scrollToBottomOfChat({ force: true, timeout: SCROLL_TIMEOUT });

    setTimeout(() => {
      setHasScrolled(true);
    }, SCROLL_TIMEOUT + 1);

    return () => {
      markTopicAsRead(topicId);
      leaveRoom(topicId, "topic");
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
    <div className="flex flex-col basis-full overflow-hidden">
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
        <audio ref={blopSoundRef} src="/sounds/blop.mp3" />
      </ScrollArea>
    </div>
  );
}
