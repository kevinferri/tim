"use client";

import { useLayoutEffect } from "react";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import {
  getMessagePositionFlags,
  useTopicMessagesContext,
  useTopicMetaContext,
  useTopicUiContext,
} from "./current-topic-provider";
import { useUnreadTopics } from "@/components/dashboard/unread-topics-store";
import { useRoomManagement } from "@/components/socket/use-current-user-rooms";
import { ArrowDownIcon, EnvelopeClosedIcon } from "@radix-ui/react-icons";
import { Message, MessageProps } from "./message";
import { isToday, MessageDateSeparator } from "./message-date-separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfiniteLoader } from "@/components/ui/infinite-loader";
import { Button } from "@/components/ui/button";
import { MoreMessagesSkeleton } from "@/components/topics/more-messages-skeleton";

export function TopicChat() {
  const { markTopicAsRead } = useUnreadTopics();
  const { joinRoom, leaveRoom } = useRoomManagement();

  const { topicId } = useTopicMetaContext();
  const {
    scrollToBottom,
    isAtBottom,
    unseenCount,
    blopSoundRef,
    viewportRef,
    contentRef,
    bottomSentinelRef,
  } = useTopicUiContext();
  const {
    messages,
    loadMoreMessages,
    loadingMoreMessages,
    hasMoreMessages,
    recency,
  } = useTopicMessagesContext();

  // Land on the newest message before the browser ever paints -- no
  // flash of the top of history, no timers.
  useLayoutEffect(() => {
    scrollToBottom({ behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffectOnce(() => {
    joinRoom(topicId, "topic");

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
    <div className="flex flex-col basis-full overflow-hidden relative">
      <ScrollArea className="flex flex-col basis-full" ref={viewportRef}>
        <div ref={contentRef} className="flex flex-col">
          {hasMoreMessages && (
            <InfiniteLoader
              loading={loadingMoreMessages}
              fetchNextPage={loadMoreMessages}
              containerRef={viewportRef}
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

            const isVeryFirstMessage =
              index === 0 && !hasMoreMessages && !loadingMoreMessages;

            const showDateSeparator =
              (!prevDate ||
                currentDate.getDate() !== prevDate.getDate() ||
                currentDate.getMonth() !== prevDate.getMonth() ||
                currentDate.getFullYear() !== prevDate.getFullYear()) &&
              !(index === 0 && loadingMoreMessages) &&
              !(isVeryFirstMessage && isToday(currentDate));

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <MessageDateSeparator date={currentDate} />
                )}
                <Message
                  {...message}
                  context="topic"
                  {...getMessagePositionFlags(recency, message.id)}
                />
              </div>
            );
          })}

          <div ref={bottomSentinelRef} />
          <audio ref={blopSoundRef} src="/sounds/blop.mp3" />
        </div>
      </ScrollArea>

      {!isAtBottom && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md rounded-full gap-1.5"
          onClick={() => scrollToBottom()}
        >
          <ArrowDownIcon />
          {unseenCount > 0
            ? `${unseenCount} new message${unseenCount === 1 ? "" : "s"}`
            : "Jump to latest"}
        </Button>
      )}
    </div>
  );
}
