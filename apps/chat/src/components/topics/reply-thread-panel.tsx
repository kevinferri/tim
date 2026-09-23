"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Message, MessageProps } from "@/components/topics/message";
import {
  getMessagePositionFlags,
  MessageRecency,
  useTopicUiContext,
} from "@/components/topics/current-topic-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
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

function threadRecency(messages: MessageProps[]): MessageRecency {
  return {
    oldestMessageId: messages[0]?.id,
    newestMessageId: messages[messages.length - 1]?.id,
    recentMessageIds: new Set(
      messages
        .slice(-5)
        .map((m) => m.id!)
        .filter(Boolean),
    ),
  };
}

export function ReplyThreadPanel({ topicId, threadRootId }: Props) {
  const { setOpenThreadRootId } = useTopicUiContext();
  const topRef = useRef<HTMLDivElement | null>(null);
  const queryKey = useMemo(
    () => threadQueryKey(topicId, threadRootId),
    [topicId, threadRootId],
  );

  // Root first, then replies oldest -> newest -- ordered by the API, and kept
  // that way by the socket fan-out in use-topic-messages (appends at the end).
  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchThread(topicId, threadRootId),
  });

  const recency = useMemo(() => threadRecency(messages), [messages]);
  const replyCount = Math.max(0, messages.length - 1);

  useEffect(() => {
    // Start at the oldest message so top-down reading feels natural.
    topRef.current?.scrollIntoView({ block: "start" });
  }, [threadRootId]);

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden bg-background">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0">
        <span className="truncate text-sm leading-none">Thread</span>
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
          <div className="flex min-w-0 flex-col pb-4">
            <div ref={topRef} />
            {messages.map((message, index) => {
              const isFirstReply = index === 1;

              return (
                <div key={message.id} className="min-w-0 max-w-full">
                  {isFirstReply && (
                    // No gap: the rules butt against the badge so the divider
                    // reads as one continuous line through it.
                    <div className="flex items-center py-2">
                      <span className="h-px flex-1 bg-border/70" aria-hidden />
                      <Badge
                        variant="secondary"
                        className="shrink-0 font-normal"
                      >
                        {replyCount} {replyCount === 1 ? "reply" : "replies"}
                      </Badge>
                      <span className="h-px flex-1 bg-border/70" aria-hidden />
                    </div>
                  )}
                  <Message
                    {...message}
                    variant="default"
                    context="sidebar"
                    className={THREAD_MESSAGE_CLASS}
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

// Keep baseStyles' padding and hover background: the wash is what makes the
// message's box edge visible, which is what the action toolbar straddles.
const THREAD_MESSAGE_CLASS = "max-w-full rounded-none";
