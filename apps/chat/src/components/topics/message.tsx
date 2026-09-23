import { memo, useMemo, useState } from "react";
import type { Message as DbMessage, Highlight, User } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { cn } from "@/lib/utils";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { HighlightTooltip } from "@/components/topics/highlight-tooltip";
import {
  useTopicGifContext,
  useTopicMetaContext,
  useTopicUiContext,
} from "@/components/topics/current-topic-provider";
import { MediaViewer } from "@/components/topics/media-viewer";
import { UserAvatar } from "@/components/ui/user-avatar";
import { MessageActions } from "@/components/topics/message-actions";
import { MessageText } from "@/components/topics/message-text";
import { LinkPreview } from "@/components/topics/link-preview";
import { ReplyPreview } from "@/components/topics/reply-preview";
import {
  baseStyles,
  highlightStyles,
  markerRingStyles,
} from "@/components/topics/message-styles";
import { MessageEdit } from "@/components/topics/message-edit";
import {
  adjustHeight,
  getLinksFromMessage,
  truncateText,
} from "@/components/topics/message-utils";
import { MessageSentAt } from "@/components/topics/message-sent-at";
import { OpenAiViewer } from "@/components/topics/open-ai-viewer";
import { RollResult } from "@/components/topics/roll-result";
import { EightBallResult } from "@/components/topics/eight-ball-result";
import { CommandName, parseCommand } from "@tim/commands";
import { getDisplayName } from "@tim/user-display";
import {
  MessageSurface,
  messageAnchorId,
} from "@/components/topics/message-anchor";
import { Button } from "@/components/ui/button";
import { ReplyIcon } from "@/components/icons/reply-icon";

export type Highlights = {
  id: Highlight["id"];
  userId: Highlight["userId"];
  createdBy?: {
    imageUrl: User["imageUrl"];
  };
  [key: string]: any;
}[];

export type MessageData = {
  topicId?: string;
  id?: string;
  text?: string;
  mediaUrl?: string | null;
  createdAt?: Date;
  replyToId?: string | null;
  threadRootId?: string | null;
  replyCount?: number;
  sentBy?: {
    id: string;
    name: string | null;
    imageUrl: string | null;
    createdAt: Date;
    status: string | null;
    lastStatusUpdate: Date | null;
  };
  highlights?: Highlights;
  // Present only when this message is a reply; absent (not just falsy) once
  // the original is deleted -- see the SetNull comment on Message.replyTo
  // in schema.prisma.
  replyTo?: {
    id: string;
    text?: string;
    mediaUrl?: string | null;
    sentBy?: { id: string; name: string | null };
  } | null;
  [key: string]: any;
};

export type MessageProps = MessageData & {
  variant: "default" | "minimal";
  className?: string;
  hiddenElements?: Array<"sentBy" | "sentAt" | "highlights">;
  context?: MessageSurface;
  // Computed once by whoever renders the list, not by this component, so
  // unrelated messages don't re-render when a new one arrives.
  isNewestMessage?: boolean;
  isRecentMessage?: boolean;
  isFirstMessage?: boolean;
};

const MessageComponent = (props: MessageProps) => {
  const { topicId } = useTopicMetaContext();
  const {
    scrollToBottom,
    setReplyingTo,
    openThreadRootId,
    setOpenThreadRootId,
    highlightedMessageId,
    jumpToMessage,
  } = useTopicUiContext();
  const { addShufflingGif, shufflingGifs } = useTopicGifContext();
  const self = useSelf();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState(props.text);
  const [shuffledGifLoading, setShuffledGifLoading] = useState(false);
  const createdAt = new Date(props.createdAt || new Date());
  const sentBySelf = props.sentBy?.id === self.id;
  const isRecentMessage = props.isRecentMessage ?? false;
  const isFirstMessage = props.isFirstMessage ?? false;
  const isNewestMessage = props.isNewestMessage ?? false;
  const isShufflingGif =
    (props.id && shufflingGifs.includes(props.id)) || shuffledGifLoading;
  const isActionEligable = props.variant !== "minimal";
  const replyCount = props.replyCount ?? 0;
  const isJumpTarget = !!props.id && highlightedMessageId === props.id;
  // Keeps the transcript's copy of the root lit while its thread sheet is open,
  // so it's clear which message the replies belong to.
  const isOpenThreadRoot =
    props.context === "topic" && !!props.id && openThreadRootId === props.id;

  const highlights = props.highlights || [];

  const highlightedBySelf = !!highlights?.find(
    (highlight) => self.id === highlight.userId,
  );

  const links = useMemo(
    () => getLinksFromMessage(props.text ?? undefined),
    [props.text],
  );

  const toggleHighlight = useSocketEmit<{ messageId: string; topicId: string }>(
    SocketEvent.ToggleHighlight,
  );

  const editMessage = useSocketEmit<{
    messageId: string;
    topicId: string;
    text: string;
  }>(SocketEvent.EditMessage);

  const shuffleGif = useSocketEmit<{
    messageId: string;
    topicId: string;
  }>(SocketEvent.ShuffleGifMessage);

  const expandImage = useSocketEmit<{ messageId: string; topicId: string }>(
    SocketEvent.UserExpandedImage,
  );

  const handleToggleHighlight = () => {
    if (!props.id) return;
    toggleHighlight.emit({
      messageId: props.id,
      topicId,
    });
  };

  const onEditConfirm = () => {
    if (!editingText || !editingText.trim()) return;

    setIsEditing(false);

    if (editingText === props.text) return;
    if (!props.id) return;

    editMessage.emit({
      topicId,
      messageId: props.id,
      text: editingText,
    });
  };

  const onEditCancel = () => {
    setIsEditing(false);
    setEditingText(props.text);
  };

  const isThreadSidebar = props.context === "sidebar";
  // In the thread panel the root is already on screen — quoting it on every
  // direct reply just burns vertical space. Keep quotes only for reply-to-reply.
  const showReplyPreview =
    props.variant !== "minimal" &&
    !!props.replyTo &&
    !(isThreadSidebar && props.replyToId === props.threadRootId);

  return (
    <div
      id={props.id ? messageAnchorId(props.context, props.id) : undefined}
      className={cn(
        baseStyles,
        isOpenThreadRoot || isJumpTarget ? markerRingStyles : "",
        highlightedBySelf ? highlightStyles : "",
        props.variant === "minimal"
          ? "after:bg-inherit dark:after:bg-inherit dark:text-primary"
          : "",
        props.className,
      )}
      onDoubleClick={(e) => {
        if (props.variant !== "minimal") handleToggleHighlight();

        const element = e.target as HTMLElement;
        if (element.tagName !== "TEXTAREA" && typeof window !== "undefined") {
          window.getSelection()?.removeAllRanges();
        }
      }}
      onMouseEnter={() => {
        if (isActionEligable) setShowActions(true);
      }}
      onMouseLeave={() => {
        if (isActionEligable) setShowActions(false);
      }}
    >
      <div
        className={cn("flex items-start gap-3 overflow-hidden leading-none")}
      >
        {!props.hiddenElements?.includes("sentBy") && props.sentBy && (
          <UserAvatar
            id={props.sentBy.id}
            name={props.sentBy.name}
            imageUrl={props.sentBy.imageUrl}
            createdAt={props.sentBy.createdAt}
            topicId={topicId}
            disableSheet={props.context === "user-sheet"}
            status={props.sentBy.status}
            lastStatusUpdate={props.sentBy.lastStatusUpdate}
          />
        )}

        <div
          className={cn(
            "flex flex-1 flex-col gap-1 overflow-hidden leading-none min-w-0",
          )}
        >
          <div className="flex gap-2 items-center min-w-0">
            {!props.hiddenElements?.includes("sentBy") && props.sentBy && (
              <UserAvatar
                id={props.sentBy.id}
                topicId={topicId}
                name={props.sentBy.name}
                imageUrl={props.sentBy.imageUrl}
                createdAt={props.sentBy.createdAt}
                disableSheet={props.context === "user-sheet"}
                status={props.sentBy.status}
                lastStatusUpdate={props.sentBy.lastStatusUpdate}
              >
                <span
                  className={cn(
                    "font-semibold truncate",
                    props.sentBy.id === self.id && "text-mention",
                  )}
                >
                  {getDisplayName(props.sentBy.name)}
                </span>
              </UserAvatar>
            )}

            {!props.hiddenElements?.includes("sentAt") && (
              <MessageSentAt sentAt={createdAt} />
            )}

            {showActions && isActionEligable && (
              <MessageActions
                sentBySelf={sentBySelf}
                // The oldest message has nothing above it to straddle into --
                // and in the thread panel a negative offset would clip out of
                // the scroll viewport -- so pin it flush to the top edge.
                className={isFirstMessage ? "top-0" : ""}
                messageId={props.id!}
                text={props.text ?? ""}
                mediaUrl={props.mediaUrl ?? ""}
                isShufflingGif={isShufflingGif}
                onEditMessage={() => {
                  setIsEditing(true);
                  // scrollToBottom is the main transcript's and sets
                  // isAtBottom, which gates its live-window trim. In the thread
                  // panel isNewestMessage is thread-local, so acting on it here
                  // would pin (and trim) a transcript the user isn't even
                  // looking at.
                  if (isNewestMessage && !isThreadSidebar) {
                    scrollToBottom({ behavior: "instant" });
                  }
                }}
                onShuffleGif={() => {
                  if (!props.id) return;
                  addShufflingGif(props.id);
                  setShuffledGifLoading(true);
                  shuffleGif.emit({ messageId: props.id, topicId });
                }}
                onReply={() => {
                  if (!props.id || !props.sentBy?.id) return;
                  // The thread sheet is modal, so the composer is unreachable
                  // until it closes -- dismiss it and stage the reply there.
                  if (isThreadSidebar) setOpenThreadRootId(undefined);
                  setReplyingTo({
                    id: props.id,
                    text: props.text ?? "",
                    mediaUrl: props.mediaUrl,
                    senderName: props.sentBy.name ?? null,
                    senderId: props.sentBy.id,
                  });
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            {showReplyPreview && props.replyTo && (
              <ReplyPreview
                senderName={props.replyTo.sentBy?.name ?? null}
                text={props.replyTo.text ?? ""}
                mediaUrl={props.replyTo.mediaUrl}
                onClick={() => {
                  // From the transcript, the thread is the better destination:
                  // it renders the quoted message's root at the top, so it
                  // answers "what were they replying to" and gives the rest of
                  // the conversation. Elsewhere -- inside the thread itself, or
                  // in a modal/sheet where stacking another would be odd --
                  // jump to the quoted message instead.
                  if (props.context === "topic" && props.threadRootId) {
                    setOpenThreadRootId(props.threadRootId);
                    return;
                  }

                  jumpToMessage(props.replyTo!.id, props.context);
                }}
              />
            )}

            {isEditing ? (
              <MessageEdit
                onEditCancel={onEditCancel}
                onEditConfirm={onEditConfirm}
                editingText={editingText ?? ""}
                onChange={(e) => {
                  setEditingText(e.target.value);
                  adjustHeight(e.target);
                }}
              />
            ) : (
              <MessageText
                id={props.id!}
                topicId={topicId}
                text={
                  props.variant === "minimal"
                    ? truncateText(props.text ?? "")
                    : props.text
                }
                isNewestMessage={isNewestMessage}
              />
            )}

            {props.mediaUrl &&
              (parseCommand(props.text ?? "")?.name === CommandName.Tim ? (
                <OpenAiViewer content={props.mediaUrl} />
              ) : parseCommand(props.text ?? "")?.name === CommandName.Roll ? (
                <RollResult content={props.mediaUrl} />
              ) : parseCommand(props.text ?? "")?.name ===
                CommandName.EightBall ? (
                <EightBallResult content={props.mediaUrl} />
              ) : (
                <MediaViewer
                  priority={props.context === "topic"}
                  variant={props.variant}
                  url={props.mediaUrl}
                  skipVirtualization={isRecentMessage}
                  onImageExpanded={() => {
                    if (props.id)
                      expandImage.emit({ topicId, messageId: props.id });
                  }}
                  onPreviewLoad={() => {
                    if (shuffledGifLoading) {
                      setShuffledGifLoading(false);
                    }
                  }}
                />
              ))}

            {props.variant !== "minimal" &&
              links.map((link, i) => {
                return (
                  <LinkPreview
                    messageId={props.id!}
                    topicId={topicId}
                    key={`${props.id}${link}${i}`}
                    link={link}
                    mediaUrl={props.mediaUrl}
                  />
                );
              })}

            {props.variant !== "minimal" &&
              props.context === "topic" &&
              !props.threadRootId &&
              replyCount > 0 && (
                <Button
                  variant="ghost"
                  size="inline"
                  // No hover fill: it would read as a box under the message.
                  // Hover shifts colour, matching ReplyPreview.
                  className="self-start gap-1.5 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => setOpenThreadRootId(props.id)}
                >
                  <ReplyIcon />
                  {replyCount} {replyCount === 1 ? "reply" : "replies"}
                </Button>
              )}
          </div>
        </div>

        {!props.hiddenElements?.includes("highlights") && (
          <HighlightTooltip
            className={props.hiddenElements?.includes("sentAt") ? "mt-0" : ""}
            highlightedBySelf={highlightedBySelf}
            highlights={highlights}
            messageId={props.id!}
            onHighlight={handleToggleHighlight}
          />
        )}
      </div>
    </div>
  );
};

export const Message = memo(MessageComponent);
