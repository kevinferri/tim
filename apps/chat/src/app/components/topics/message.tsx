import { ChangeEvent, useMemo, useState } from "react";
import type { Message as DbMessage, Highlight, User } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { cn, hydrateUrl, isValidUrl } from "@/lib/utils";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { HighlightTooltip } from "@/components/topics/highlight-tooltip";
import { useCurrentTopicContext } from "@/components/topics/current-topic-provider";
import { MediaViewer } from "@/components/topics/media-viewer";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AutoResizeTextarea } from "@/components/topics/auto-resize-textarea";
import { MessageActions } from "@/components/topics/message-actions";
import { MessageText } from "@/components/topics/message-text";
import { LinkPreview } from "@/components/topics/link-preview";
import { useTimeZone } from "@/lib/hooks";

function adjustHeight(target: ChangeEvent<HTMLTextAreaElement>["target"]) {
  target.style.height = "";
  target.style.height = `${target.scrollHeight + 0.5}px`;
}

function truncateText(str: string, maxLength = 50) {
  const words = str.split(/\s+/);
  if (words.length <= maxLength) return str;
  return `${str.split(" ").splice(0, maxLength).join(" ")}...`;
}

function getLinksFromMessage(message?: string) {
  if (!message) return [];

  const links = [];
  const words = message.split(/\s+/);

  for (let word of words) {
    const url = hydrateUrl(word);
    if (isValidUrl(url)) links.push(url);
  }

  return links;
}

export type Highlights = {
  id: Highlight["id"];
  userId: Highlight["userId"];
  createdBy: {
    imageUrl: User["imageUrl"];
  };
}[];

export type MessageProps = {
  id: DbMessage["id"];
  text?: DbMessage["text"];
  mediaUrl?: DbMessage["mediaUrl"];
  createdAt: DbMessage["createdAt"];
  sentBy: Pick<User, "id" | "name" | "imageUrl" | "createdAt">;
  highlights: Highlights;
  variant: "default" | "minimal";
  className?: string;
  hiddenElements?: Array<"sentBy" | "sentAt" | "highlights">;
  context?: "topic" | "sidebar" | "user-sheet";
};

const baseStyles = [
  "z-0",
  "p-3",
  "relative",
  "hover:bg-slate-50",
  "dark:hover:bg-slate-900",
  "after:content-['']",
  "after:h-full",
  "after:absolute",
  "after:left-[0]",
  "after:top-[0]",
  "after:w-[0]",
  "after:-z-10",
];

const highlightStyles = [
  "after:-z-10",
  "after:w-full",
  "after:bg-highlight",
  "after:[transition:500ms]",
  "dark:after:bg-purple-950",
];

export const Message = (props: MessageProps) => {
  const {
    topicId,
    scrollToBottomOfChat,
    messages,
    addShufflingGif,
    shufflingGifs,
  } = useCurrentTopicContext();

  const self = useSelf();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState(props.text);
  const [shuffledGifLoading, setShuffledGifLoading] = useState(false);
  const createdAt = new Date(props.createdAt);
  const sentBySelf = props.sentBy.id === self.id;
  const isNewestMessage =
    messages.length > 0 && messages[messages.length - 1].id === props.id;
  const isShufflingGif = shufflingGifs.includes(props.id) || shuffledGifLoading;
  const { timeZone } = useTimeZone();
  const shouldScroll = isNewestMessage && props.context === "topic";
  const highlightedBySelf = !!props.highlights.find(
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

  return (
    <div
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
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3 items-start overflow-hidden leading-tight">
        {!props.hiddenElements?.includes("sentBy") && (
          <UserAvatar
            id={props.sentBy.id}
            name={props.sentBy.name}
            imageUrl={props.sentBy.imageUrl}
            createdAt={props.sentBy.createdAt}
            topicId={topicId}
            disableSheet={props.context === "user-sheet"}
          />
        )}

        <div className="flex flex-col flex-1">
          <div className="flex gap-3 items-center">
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
              <>
                {" "}
                <time
                  suppressHydrationWarning
                  className="text-slate-300 text-xs"
                >
                  {createdAt.toLocaleDateString("en-US", {
                    timeZone,
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "numeric",
                  })}
                </time>
              </>
            )}

            {showActions && sentBySelf && props.variant !== "minimal" && (
              <MessageActions
                className={messages[0].id === props.id ? "top-0" : ""}
                messageId={props.id}
                text={props.text ?? ""}
                mediaUrl={props.mediaUrl ?? ""}
                isShufflingGif={isShufflingGif}
                onEditMessage={() => {
                  setIsEditing(true);
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
              <div>
                <AutoResizeTextarea
                  onChange={(e) => {
                    setEditingText(e.target.value);
                    adjustHeight(e.target);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      onEditConfirm();
                    }

                    if (e.key === "Escape") {
                      onEditCancel();
                    }
                  }}
                  value={editingText ?? ""}
                />
                <div className="flex gap-1 text-xs">
                  <span>
                    esc to{" "}
                    <span
                      className="cursor-pointer text-purple-700"
                      onClick={onEditCancel}
                    >
                      cancel
                    </span>
                  </span>
                  <span>•</span>
                  <span>
                    enter to{" "}
                    <span
                      className="cursor-pointer text-purple-700"
                      onClick={onEditConfirm}
                    >
                      save changes
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <MessageText
                id={props.id}
                text={
                  props.variant === "minimal"
                    ? truncateText(props.text ?? "")
                    : props.text
                }
                isNewestMessage={isNewestMessage}
              />
            )}

            {props.mediaUrl && (
              <MediaViewer
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
                    scrollToBottomOfChat({ force: true });
                  }
                }}
              />
            )}

            {props.variant !== "minimal" &&
              links.map((link, i) => {
                return (
                  <LinkPreview
                    key={`${props.id}${link}${i}`}
                    link={link}
                    onEmbedMediaLoad={() => {
                      if (shouldScroll) {
                        scrollToBottomOfChat({ force: true });
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
            highlights={props.highlights}
            messageId={props.id}
            onHighlight={handleToggleHighlight}
          />
        )}
      </div>
    </div>
  );
};
