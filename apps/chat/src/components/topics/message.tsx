import { useMemo, useState } from "react";
import type { Message as DbMessage, Highlight, User } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { cn } from "@/lib/utils";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { HighlightTooltip } from "@/components/topics/highlight-tooltip";
import { useCurrentTopicContext } from "@/components/topics/current-topic-provider";
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
import { useIslandMessage } from "@/components/topics/use-island-message";
import { OpenAiViewer } from "@/components/topics/open-ai-viewer";

export type Highlights = {
  id: Highlight["id"];
  userId: Highlight["userId"];
  createdBy: {
    imageUrl: User["imageUrl"];
  };
}[];

export type MessageProps = {
  topicId: string;
  id: DbMessage["id"];
  text?: DbMessage["text"];
  mediaUrl?: DbMessage["mediaUrl"];
  createdAt: DbMessage["createdAt"];
  sentBy: Pick<
    User,
    "id" | "name" | "imageUrl" | "createdAt" | "status" | "lastStatusUpdate"
  >;
  highlights: Highlights;
  variant: "default" | "minimal";
  className?: string;
  hiddenElements?: Array<"sentBy" | "sentAt" | "highlights">;
  context?: "topic" | "sidebar" | "user-sheet" | "modal";
};

export const Message = (props: MessageProps) => {
  const {
    topicId,
    scrollToBottomOfChat,
    messages,
    addShufflingGif,
    shufflingGifs,
    loadMoreAnchorRef,
    loadMoreAnchorId,
    newestMessageRef,
  } = useCurrentTopicContext();
  const self = useSelf();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState(props.text);
  const [shuffledGifLoading, setShuffledGifLoading] = useState(false);
  const createdAt = new Date(props.createdAt);
  const sentBySelf = props.sentBy.id === self.id;
  const mLength = messages.length;
  const isIsland = props.context === "modal" || props.context === "user-sheet";
  const isNewestMessage = mLength > 0 && messages[mLength - 1].id === props.id;
  const isShufflingGif = shufflingGifs.includes(props.id) || shuffledGifLoading;
  const shouldScroll = isNewestMessage && props.context === "topic";
  const isActionEligable = sentBySelf && props.variant !== "minimal";

  const islandMessage = useIslandMessage({
    messageId: props.id,
    existingHighlights: props.highlights,
    skip: !isIsland,
  });

  const highlights = isIsland ? islandMessage.highlights : props.highlights;

  const highlightedBySelf = !!highlights.find(
    (highlight) => self.id === highlight.userId
  );

  const links = useMemo(
    () => getLinksFromMessage(props.text ?? undefined),
    [props.text]
  );

  const toggleHighlight = useSocketEmit<{ messageId: string; topicId: string }>(
    SocketEvent.ToggleHighlight
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
    SocketEvent.UserExpandedImage
  );

  const handleToggleHighlight = () => {
    toggleHighlight.emit({
      messageId: props.id,
      topicId,
    });
  };

  const onEditConfirm = () => {
    if (!editingText || !editingText.trim()) return;

    setIsEditing(false);

    if (editingText === props.text) return;

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

  const getRef = () => {
    if (loadMoreAnchorId === props.id) {
      return loadMoreAnchorRef;
    }

    if (isNewestMessage) {
      return newestMessageRef;
    }

    return undefined;
  };

  return (
    <div
      ref={getRef()}
      className={cn(
        baseStyles,
        highlightedBySelf ? highlightStyles : "",
        props.variant === "minimal"
          ? "after:bg-inherit dark:after:bg-inherit dark:text-primary"
          : "",
        props.className
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
      <div className="flex gap-1.5 items-start overflow-hidden leading-none">
        {!props.hiddenElements?.includes("sentBy") && (
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
          <div className="flex gap-1.5 items-center">
            {!props.hiddenElements?.includes("sentBy") && (
              <span
                className={cn(
                  `font-semibold ${
                    props.sentBy.id === self.id &&
                    "text-purple-700 dark:text-purple-500"
                  }`
                )}
              >
                {props.sentBy.name?.split(" ")[0]}
              </span>
            )}

            {!props.hiddenElements?.includes("sentAt") && (
              <MessageSentAt sentAt={createdAt} />
            )}

            {showActions && isActionEligable && (
              <MessageActions
                className={messages[0].id === props.id ? "top-0" : ""}
                messageId={props.id}
                text={props.text ?? ""}
                mediaUrl={props.mediaUrl ?? ""}
                isShufflingGif={isShufflingGif}
                onEditMessage={() => {
                  setIsEditing(true);
                  if (isNewestMessage) scrollToBottomOfChat({ force: true });
                }}
                onShuffleGif={() => {
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
                id={props.id}
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
              (props.text?.toLowerCase().startsWith("/tim") ? (
                <OpenAiViewer content={props.mediaUrl} />
              ) : (
                <MediaViewer
                  priority={props.context === "topic"}
                  variant={props.variant}
                  url={props.mediaUrl}
                  onImageExpanded={() => {
                    expandImage.emit({ topicId, messageId: props.id });
                  }}
                  onPreviewLoad={() => {
                    if (shuffledGifLoading) {
                      setShuffledGifLoading(false);
                    }

                    if (shouldScroll) {
                      scrollToBottomOfChat();
                    }
                  }}
                />
              ))}

            {props.variant !== "minimal" &&
              links.map((link, i) => {
                return (
                  <LinkPreview
                    messageId={props.id}
                    topicId={topicId}
                    key={`${props.id}${link}${i}`}
                    link={link}
                    onEmbedMediaLoad={() => {
                      if (shouldScroll) {
                        scrollToBottomOfChat();
                      }
                    }}
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
            messageId={props.id}
            onHighlight={handleToggleHighlight}
          />
        )}
      </div>
    </div>
  );
};
