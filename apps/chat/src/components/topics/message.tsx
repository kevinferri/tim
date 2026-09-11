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
import {
  baseStyles,
  highlightStyles,
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
  sentBy?: {
    id: string;
    name: string | null;
    imageUrl: string | null;
    createdAt: Date;
    status: string | null;
    lastStatusUpdate: Date | null;
  };
  highlights?: Highlights;
  [key: string]: any;
};

export type MessageProps = MessageData & {
  variant: "default" | "minimal";
  className?: string;
  hiddenElements?: Array<"sentBy" | "sentAt" | "highlights">;
  context?: "topic" | "sidebar" | "user-sheet" | "modal";
  // Where this message sits in the topic's timeline -- computed once
  // by whoever renders the list (see getMessagePositionFlags) rather
  // than by this component, so unrelated messages don't have to
  // re-render just because a new one arrived. See current-topic-
  // provider.tsx for why.
  isNewestMessage?: boolean;
  isRecentMessage?: boolean;
  isFirstMessage?: boolean;
};

const MessageComponent = (props: MessageProps) => {
  const { topicId } = useTopicMetaContext();
  const { scrollToBottom } = useTopicUiContext();
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

  return (
    <div
      className={cn(
        baseStyles,
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
      <div className="flex gap-3 items-start overflow-hidden leading-none">
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

        <div className="flex flex-col flex-1">
          <div className="flex gap-2 items-center">
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
                    `font-semibold ${
                      props.sentBy.id === self.id && "text-mention"
                    }`,
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
                className={isFirstMessage ? "top-0" : ""}
                messageId={props.id!}
                text={props.text ?? ""}
                mediaUrl={props.mediaUrl ?? ""}
                isShufflingGif={isShufflingGif}
                onEditMessage={() => {
                  setIsEditing(true);
                  if (isNewestMessage) scrollToBottom({ behavior: "instant" });
                }}
                onShuffleGif={() => {
                  if (!props.id) return;
                  addShufflingGif(props.id);
                  setShuffledGifLoading(true);
                  shuffleGif.emit({ messageId: props.id, topicId });
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
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
