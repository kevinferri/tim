"use client";

import { useState } from "react";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { useCurrentTopicContext } from "./current-topic-provider";
import { useUnreadTopics } from "@/components/dashboard/unread-topics-store";
import { useRoomManagement } from "@/components/socket/use-current-user-rooms";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { Message, MessageProps } from "./message";
import { MessageDateSeparator } from "./message-date-separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfiniteLoader } from "@/components/ui/infinite-loader";
import { Skeleton } from "@/components/ui/skeleton";

const SCROLL_TIMEOUT = 500;

function MoreMessagesSkeleton() {
  const widths = [
    "w-[70%]",
    "w-[60%]",
    "w-[50%]",
    "w-[80%]",
    "w-[65%]",
    "w-[55%]",
    "w-[75%]",
  ];

  return (
    <>
      {[...Array(3)].map((_, i) => {
        const widthClass = widths[Math.floor(Math.random() * widths.length)];

        return (
          <div key={i} className="flex items-start space-x-2 p-3 w-full">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex flex-col space-y-2 w-full">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className={`h-4 ${widthClass}`} />
            </div>
          </div>
        );
      })}
    </>
  );
}

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
    // Immediate snap to bottom
    scrollToBottomOfChat({ force: true });

    // Join room
    joinRoom(topicId, "topic");

    // If there are lazily loaded assets, try scrolling again
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
            <div className="flex flex-col">
              <MoreMessagesSkeleton />
            </div>
          </InfiniteLoader>
        )}

        {messages.map((message: MessageProps, index: number) => {
          const currentDate = new Date(message.createdAt ?? new Date());
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const prevDate = prevMessage
            ? new Date(prevMessage.createdAt ?? new Date())
            : null;

          const showDateSeparator =
            !prevDate ||
            currentDate.getDate() !== prevDate.getDate() ||
            currentDate.getMonth() !== prevDate.getMonth() ||
            currentDate.getFullYear() !== prevDate.getFullYear();

          return (
            <div key={message.id}>
              {showDateSeparator && <MessageDateSeparator date={currentDate} />}
              <Message {...message} context="topic" />
            </div>
          );
        })}

        <div ref={scrollRef} />
        <audio ref={blopSoundRef} src="/sounds/blop.mp3" />
      </ScrollArea>
    </div>
  );
}
