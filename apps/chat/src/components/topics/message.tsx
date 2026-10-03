import { memo, useMemo, useState } from "react";
import type { Message as DbMessage, Highlight, User } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { cn } from "@/lib/utils";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import {
  MessageHighlights,
  useHighlightBurst,
} from "@/components/topics/message-highlights";
import { MessageContextMenu } from "@/components/topics/message-context-menu";
import {
  useTopicGifContext,
  useTopicMetaContext,
  useTopicUiContext,
} from "@/components/topics/current-topic-provider";
import { MediaViewer } from "@/components/topics/media-viewer";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  MessageActions,
  getOwnMessageActions,
} from "@/components/topics/message-actions";
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
  isBareRoll,
} from "@/components/topics/message-utils";
import { MessageSentAt } from "@/components/topics/message-sent-at";
import { renderCommandResult } from "@/components/topics/message-attachment";
import { parseCommand } from "@tim/commands";
import { useCanHover } from "@/lib/hooks/use-can-hover";
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
    name?: User["name"];
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
  className?: string;
  context?: MessageSurface;
  // Computed once by whoever renders the list, not by this component, so
  // unrelated messages don't re-render when a new one arrives.
  isNewestMessage?: boolean;
  isRecentMessage?: boolean;
  isFirstMessage?: boolean;
};

const MessageComponent = (props: MessageProps) => {
  const { topicId: currentTopicId } = useTopicMetaContext();
  // Notifications can show a message from another topic.
  const topicId = props.topicId ?? currentTopicId;
  const inCurrentTopic = topicId === currentTopicId;
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
  const canHover = useCanHover();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState(props.text);
  const [shuffledGifLoading, setShuffledGifLoading] = useState(false);
  const createdAt = new Date(props.createdAt || new Date());
  const sentBySelf = props.sentBy?.id === self.id;
  // Edit/delete/shuffle are room events, so only for the topic you're in.
  const canModify = sentBySelf && inCurrentTopic;
  // Replies stage in this topic's composer, which a modal or sheet covers.
  const canReply =
    inCurrentTopic &&
    props.context !== "modal" &&
    props.context !== "user-sheet";
  const isRecentMessage = props.isRecentMessage ?? false;
  const isFirstMessage = props.isFirstMessage ?? false;
  const isNewestMessage = props.isNewestMessage ?? false;
  const isShufflingGif =
    (props.id && shufflingGifs.includes(props.id)) || shuffledGifLoading;
  const isActionEligable = !!props.id;
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
  const highlightBurst = useHighlightBurst(
    highlights.length,
    highlightedBySelf,
  );

  const command = useMemo(() => parseCommand(props.text ?? ""), [props.text]);
  const ownActions = getOwnMessageActions(props.text ?? "", props.mediaUrl);

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

  const onStartEdit = () => {
    setIsEditing(true);
    // scrollToBottom is the main transcript's and sets isAtBottom, which gates
    // its live-window trim. Elsewhere isNewestMessage is relative to some
    // other list, so acting on it would pin (and trim) a transcript the user
    // isn't even looking at.
    if (isNewestMessage && props.context === "topic") {
      scrollToBottom({ behavior: "instant" });
    }
  };

  const onShuffleGif = () => {
    if (!props.id) return;
    addShufflingGif(props.id);
    setShuffledGifLoading(true);
    shuffleGif.emit({ messageId: props.id, topicId });
  };

  const onReply = () => {
    if (!props.id || !props.sentBy?.id) return;
    // The thread sheet is modal, so the composer is unreachable until it
    // closes -- dismiss it and stage the reply there.
    if (isThreadSidebar) setOpenThreadRootId(undefined);
    setReplyingTo({
      id: props.id,
      text: props.text ?? "",
      mediaUrl: props.mediaUrl,
      senderName: props.sentBy.name ?? null,
      senderId: props.sentBy.id,
    });
  };
  const showHighlights = highlights.length > 0;
  const showReplyCount =
    props.context === "topic" && !props.threadRootId && replyCount > 0;

  // In the thread panel the root is already on screen — quoting it on every
  // direct reply just burns vertical space. Keep quotes only for reply-to-reply.
  const showReplyPreview =
    !!props.replyTo &&
    !(isThreadSidebar && props.replyToId === props.threadRootId);

  return (
    <MessageContextMenu
      enabled={!canHover && isActionEligable && !!props.id}
      messageId={props.id!}
      topicId={topicId}
      text={props.text ?? ""}
      canModify={canModify}
      highlightedBySelf={highlightedBySelf}
      onHighlight={handleToggleHighlight}
      onReply={canReply ? onReply : undefined}
      onEdit={ownActions.canEdit ? onStartEdit : undefined}
      onShuffleGif={ownActions.canShuffle ? onShuffleGif : undefined}
    >
      <div
        id={props.id ? messageAnchorId(props.context, props.id) : undefined}
        className={cn(
          baseStyles,
          isOpenThreadRoot || isJumpTarget ? markerRingStyles : "",
          highlightedBySelf ? highlightStyles : "",
          // Long-press opens the message menu, so keep iOS's own callout/selection out of it.
          !canHover && "select-none [-webkit-touch-callout:none]",
          props.className,
        )}
        onDoubleClick={(e) => {
          handleToggleHighlight();

          const element = e.target as HTMLElement;
          if (element.tagName !== "TEXTAREA" && typeof window !== "undefined") {
            window.getSelection()?.removeAllRanges();
          }
        }}
        onMouseEnter={() => {
          if (isActionEligable && canHover) setShowActions(true);
        }}
        onMouseLeave={() => {
          if (isActionEligable) setShowActions(false);
        }}
      >
        {/* A glint down the highlight edge as it draws in, like the score badge's border light. */}
        {highlightBurst.own && highlightBurst.key > 0 && (
          <span
            key={highlightBurst.key}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-3 overflow-hidden motion-reduce:hidden"
          >
            <span className="absolute left-0 h-2/5 w-[1.5px] bg-gradient-to-b from-transparent via-white to-transparent opacity-0 shadow-[0_0_6px_1px_hsl(var(--highlight-icon))] animate-highlight-edge" />
          </span>
        )}

        <div
          className={cn("flex items-start gap-3 overflow-x-clip leading-none")}
        >
          {props.sentBy && (
            <UserAvatar
              id={props.sentBy.id}
              name={props.sentBy.name}
              imageUrl={props.sentBy.imageUrl}
              createdAt={props.sentBy.createdAt}
              topicId={topicId}
              disableSheet={props.context === "user-sheet"}
              status={props.sentBy.status}
              lastStatusUpdate={props.sentBy.lastStatusUpdate}
              statusVisibleAt={createdAt}
              size="md"
            />
          )}

          <div
            className={cn("flex min-w-0 flex-1 flex-col gap-0.5 leading-none")}
          >
            <div className="flex h-4 min-w-0 items-center gap-2">
              {props.sentBy && (
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
                      "truncate text-sm font-semibold",
                      props.sentBy.id === self.id && "text-mention",
                    )}
                  >
                    {getDisplayName(props.sentBy.name)}
                  </span>
                </UserAvatar>
              )}

              <MessageSentAt sentAt={createdAt} />

              {showActions && isActionEligable && (
                <MessageActions
                  canModify={canModify}
                  // The oldest message has nothing above it to straddle into --
                  // and in the thread panel a negative offset would clip out of
                  // the scroll viewport -- so pin it flush to the top edge.
                  className={isFirstMessage ? "top-0" : ""}
                  messageId={props.id!}
                  text={props.text ?? ""}
                  mediaUrl={props.mediaUrl ?? ""}
                  isShufflingGif={isShufflingGif}
                  highlightedBySelf={highlightedBySelf}
                  onHighlight={handleToggleHighlight}
                  onEditMessage={onStartEdit}
                  onShuffleGif={onShuffleGif}
                  onReply={canReply ? onReply : undefined}
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
              ) : isBareRoll(command) ? null : (
                <MessageText
                  id={props.id!}
                  topicId={topicId}
                  text={props.text}
                  isNewestMessage={isNewestMessage}
                />
              )}

              {props.mediaUrl &&
                (renderCommandResult(command, {
                  content: props.mediaUrl,
                  createdAt: props.createdAt,
                }) ?? (
                  <MediaViewer
                    priority={props.context === "topic"}
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

              {links.map((link, i) => (
                <LinkPreview
                  messageId={props.id!}
                  topicId={topicId}
                  key={`${props.id}${link}${i}`}
                  link={link}
                  mediaUrl={props.mediaUrl}
                />
              ))}

              {showReplyCount && (
                <div className="mt-1">
                  <Button
                    variant="ghost"
                    size="inline"
                    // No hover fill: it would read as a box under the message.
                    // Hover shifts colour, matching ReplyPreview.
                    className="gap-1.5 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                    onClick={() => setOpenThreadRootId(props.id)}
                  >
                    <ReplyIcon />
                    {replyCount} {replyCount === 1 ? "reply" : "replies"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {showHighlights && (
            <div className="self-center">
              <MessageHighlights
                highlights={highlights}
                highlightedBySelf={highlightedBySelf}
                onToggle={handleToggleHighlight}
                burst={highlightBurst}
              />
            </div>
          )}
        </div>
      </div>
    </MessageContextMenu>
  );
};

export const Message = memo(MessageComponent);
