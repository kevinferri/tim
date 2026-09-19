"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Highlight, User } from "@prisma/client";
import { Message, MessageProps } from "@/components/topics/message";
import {
  getMessagePositionFlags,
  MessageRecency,
  useTopicUiContext,
} from "@/components/topics/current-topic-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { threadQueryKey } from "@/components/topics/provider/topic-query-cache";

type Props = {
  topicId: string;
  threadRootId: string;
};

async function fetchThread(topicId: string, threadRootId: string) {
  const resp = await fetch(`/api/topics/${topicId}/threads/${threadRootId}`);
  if (!resp.ok) {
    throw new Error(`Request failed with status ${resp.status}`);
  }
  return (await resp.json()) as MessageProps[];
}

function messageTime(message: MessageProps) {
  return new Date(message.createdAt ?? 0).getTime();
}

// Thread root first, then replies oldest → newest.
function orderThreadMessages(
  messages: MessageProps[],
  threadRootId: string,
): MessageProps[] {
  const root = messages.find((m) => m.id === threadRootId);
  const replies = messages
    .filter((m) => m.id !== threadRootId)
    .sort((a, b) => {
      const byTime = messageTime(a) - messageTime(b);
      if (byTime !== 0) return byTime;
      return (a.id ?? "").localeCompare(b.id ?? "");
    });

  return root ? [root, ...replies] : replies;
}

function threadRecency(messages: MessageProps[]): MessageRecency {
  return {
    oldestMessageId: messages[0]?.id,
    newestMessageId: messages[messages.length - 1]?.id,
    recentMessageIds: new Set(
      messages.slice(-5).map((m) => m.id!).filter(Boolean),
    ),
  };
}

export function ReplyThreadPanel({ topicId, threadRootId }: Props) {
  const queryClient = useQueryClient();
  const { setOpenThreadRootId } = useTopicUiContext();
  const topRef = useRef<HTMLDivElement | null>(null);
  const queryKey = useMemo(
    () => threadQueryKey(topicId, threadRootId),
    [topicId, threadRootId],
  );

  const { data: rawMessages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchThread(topicId, threadRootId),
  });

  const messages = useMemo(
    () => orderThreadMessages(rawMessages, threadRootId),
    [rawMessages, threadRootId],
  );
  const recency = useMemo(() => threadRecency(messages), [messages]);
  const replyCount = Math.max(0, messages.length - 1);

  useSocketHandler<MessageProps>(SocketEvent.SendMessage, (newMessage) => {
    if (newMessage.topicId !== topicId) return;

    const belongsToThread =
      newMessage.id === threadRootId ||
      newMessage.threadRootId === threadRootId;

    if (!belongsToThread) return;

    const newMsg = {
      ...newMessage,
      createdAt: new Date(newMessage.createdAt ?? new Date()),
    };

    queryClient.setQueryData<MessageProps[]>(queryKey, (prev) => {
      const next = prev ?? [];
      if (next.some((m) => m.id === newMsg.id)) return next;
      return orderThreadMessages([...next, newMsg], threadRootId);
    });
  });

  useSocketHandler<{ deletedMessageId: string }>(
    SocketEvent.DeleteMessage,
    (payload) => {
      queryClient.setQueryData<MessageProps[]>(queryKey, (prev) => {
        if (!prev) return prev;
        return orderThreadMessages(
          prev.filter((m) => m.id !== payload.deletedMessageId),
          threadRootId,
        );
      });
    },
  );

  useSocketHandler<{ highlight: Highlight; createdBy: User }>(
    SocketEvent.AddedHighlight,
    ({ highlight, createdBy }) => {
      queryClient.setQueryData<MessageProps[]>(queryKey, (prev) => {
        if (!prev) return prev;
        return prev.map((message) => {
          if (message.id !== highlight.messageId) return message;
          if (message.highlights?.some((h) => h.id === highlight.id)) {
            return message;
          }
          return {
            ...message,
            highlights: [
              ...(message.highlights ?? []),
              {
                id: highlight.id,
                userId: highlight.userId,
                createdBy,
              },
            ],
          };
        });
      });
    },
  );

  useSocketHandler<{ messageId: string; userId: string }>(
    SocketEvent.RemovedHighlight,
    (payload) => {
      queryClient.setQueryData<MessageProps[]>(queryKey, (prev) => {
        if (!prev) return prev;
        return prev.map((message) => {
          if (message.id !== payload.messageId) return message;
          return {
            ...message,
            highlights: (message.highlights ?? []).filter(
              ({ userId }) => userId !== payload.userId,
            ),
          };
        });
      });
    },
  );

  useEffect(() => {
    // Start at the oldest message so top-down reading feels natural.
    topRef.current?.scrollIntoView({ block: "start" });
  }, [threadRootId]);

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden bg-background">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-none">Thread</div>
          {!isLoading && replyCount > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </div>
          )}
        </div>
        <Button
          size="iconSm"
          variant="ghost"
          onClick={() => setOpenThreadRootId(undefined)}
          aria-label="Close thread"
        >
          <Cross2Icon />
        </Button>
      </div>
      <ScrollArea className="flex-1 min-w-0">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col min-w-0 pb-4">
            <div ref={topRef} />
            {messages.map((message, index) => {
              const isRoot = message.id === threadRootId;
              const isFirstReply = index === 1;

              return (
                <div key={message.id} className="min-w-0 max-w-full">
                  {isFirstReply && (
                    <div
                      className="mx-4 my-2 border-t border-border/70"
                      aria-hidden
                    />
                  )}
                  <Message
                    {...message}
                    variant="default"
                    context="sidebar"
                    className={cnThreadMessage(isRoot)}
                    {...getMessagePositionFlags(recency, message.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function cnThreadMessage(isRoot: boolean) {
  return [
    "max-w-full rounded-none hover:bg-transparent dark:hover:bg-transparent",
    isRoot ? "pb-3" : "py-2",
  ].join(" ");
}
