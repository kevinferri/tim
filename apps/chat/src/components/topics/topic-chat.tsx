"use client";

import { useEffect, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import {
  getMessagePositionFlags,
  useTopicMessagesContext,
  useTopicMetaContext,
  useTopicUiContext,
} from "./current-topic-provider";
import { useUnreadTopics } from "@/components/dashboard/unread-topics-store";
import {
  RoomType,
  useRoomManagement,
} from "@/components/socket/use-current-user-rooms";
import { ChevronDownIcon, EnvelopeClosedIcon } from "@radix-ui/react-icons";
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

  useEffect(() => {
    joinRoom(topicId, RoomType.Topic);

    return () => {
      markTopicAsRead(topicId);
      leaveRoom(topicId, RoomType.Topic);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  return (
    <div className="flex flex-col basis-full overflow-hidden relative">
      <ScrollArea className="flex flex-col basis-full" ref={viewportRef}>
        {/* Always rendered (even with zero messages) so viewportRef/contentRef/
            bottomSentinelRef attach on the very first render -- useTopicScroll's
            observers are set up in effects that run once and never retry, so if
            these refs were null on mount (e.g. a brand-new empty topic), auto-scroll
            would silently never work for the rest of the session. */}
        <div ref={contentRef} className="flex flex-col min-h-full shrink-0">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col justify-center items-center gap-3 p-3 text-center">
              <div className="bg-secondary p-8 rounded-full border shadow-sm">
                <EnvelopeClosedIcon height={80} width={80} />
              </div>

              <div className="text-xl">No messages yet</div>

              <div className="text-muted-foreground text-base">
                Send a message to get the conversation going
              </div>
            </div>
          )}

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

      <Button
        size="icon"
        variant="secondary"
        aria-label={
          unseenCount > 0
            ? `${unseenCount} new message${unseenCount === 1 ? "" : "s"}, jump to latest`
            : "Jump to latest"
        }
        aria-hidden={isAtBottom}
        tabIndex={isAtBottom ? -1 : 0}
        className={cn(
          "absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-md transition-opacity duration-200",
          isAtBottom ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        onClick={() => scrollToBottom()}
      >
        <ChevronDownIcon className="size-5" />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </Button>
    </div>
  );
}
