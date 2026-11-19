"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { AttachmentFrame } from "@/components/topics/message-attachment";
import type { NewsItemDto, NewsSourceDto } from "./news-api";

export type NewsTopic = { id: string; name: string };

type Props = {
  circleId: string;
  topics: NewsTopic[];
  defaultTopicId: string | null;
  item: NewsItemDto;
  source?: NewsSourceDto;
  onDone: () => void;
};

/** Composes a message that shares a story into a topic: an optional comment above the story's link. */
export function NewsShare({
  circleId,
  topics,
  defaultTopicId,
  item,
  source,
  onDone,
}: Props) {
  const { topicId: currentTopicId } = useParams<{ topicId?: string }>();
  const [topicId, setTopicId] = useState(
    currentTopicId ?? defaultTopicId ?? topics[0]?.id ?? "",
  );
  const [comment, setComment] = useState("");
  const { emit: sendMessage } = useSocketEmit<{
    message: string;
    topicId: string;
    circleId: string;
  }>(SocketEvent.SendMessage);
  const { toast } = useToast();
  const topicName = topics.find((t) => t.id === topicId)?.name;

  function send() {
    if (!topicId) return;
    const text = comment.trim();
    sendMessage({
      message: text ? `${text}\n${item.link}` : item.link,
      topicId,
      circleId,
    });
    toast({ title: topicName ? `Shared to #${topicName}` : "Shared" });
    onDone();
  }

  return (
    <form
      className="flex flex-1 flex-col gap-4 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">To</span>
        <Select value={topicId} onValueChange={setTopicId}>
          <SelectTrigger className="h-8 w-auto min-w-36" aria-label="Topic">
            <SelectValue placeholder="Pick a topic" />
          </SelectTrigger>
          <SelectContent>
            {topics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                # {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Textarea
        autoFocus
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Add a comment (optional)"
        className="resize-none"
        maxLength={2000}
      />

      <StoryPreview item={item} source={source} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!topicId}>
          Send
        </Button>
      </div>
    </form>
  );
}

/** Matches how the link will preview in chat (components/topics/link-preview.tsx). */
function StoryPreview({
  item,
  source,
}: {
  item: NewsItemDto;
  source?: NewsSourceDto;
}) {
  const [imageBroken, setImageBroken] = useState(false);
  return (
    <AttachmentFrame>
      <div className="flex gap-3 p-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-xs text-muted-foreground">
            {source?.title ?? "News"}
          </span>
          <span className="line-clamp-2 text-sm font-semibold leading-snug">
            {item.title}
          </span>
          {item.summary && (
            <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
              {item.summary}
            </span>
          )}
        </div>
        {item.imageUrl && !imageBroken ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party hosts
          <img
            src={item.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-20 shrink-0 rounded-md object-cover"
            onError={() => setImageBroken(true)}
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <ExternalLinkIcon />
          </div>
        )}
      </div>
    </AttachmentFrame>
  );
}
