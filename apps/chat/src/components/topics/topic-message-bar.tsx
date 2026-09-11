"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import {
  useTopicMetaContext,
  useTopicUiContext,
} from "@/components/topics/current-topic-provider";
import { MediaUploader } from "@/components/topics/media-uploader";
import { uploadMedia } from "@/actions/media";
import { MediaViewer } from "@/components/topics/media-viewer";
import { Button } from "@/components/ui/button";
import { CrossCircledIcon } from "@radix-ui/react-icons";
import { Progress } from "@/components/ui/progress";
import { useUploadProgres } from "@/components/topics/use-upload-progress";
import { useUserTypingEmitter } from "@/lib/hooks/use-user-typing-emitter";
import { AutoResizeTextarea } from "@/components/topics/auto-resize-textarea";
import { cn, toBase64 } from "@/lib/utils";
import { EmojiPicker } from "@/components/topics/emoji-picker";
import { ThinkingDots } from "@/components/topics/thinking-dots";
import {
  extractImageFromMessage,
  getTwitchStreamFromUrl,
  getYoutubeVideoFromUrl,
  isValidCommand,
  stripLeadingEmoji,
} from "@/components/topics/message-utils";
import { CommandName, CommandInfo, COMMANDS, parseCommand } from "@tim/commands";
import { CommandAutocomplete } from "@/components/topics/command-autocomplete";
import {
  MentionAutocomplete,
  MentionCandidate,
} from "@/components/topics/mention-autocomplete";
import {
  TopicLinkAutocomplete,
  TopicLinkCandidate,
} from "@/components/topics/topic-link-autocomplete";
import { MessageHighlightOverlay } from "@/components/topics/message-highlight-overlay";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-store";
import { useSelf } from "@/components/auth/self-provider";
import { getDisplayName } from "@tim/user-display";

type MessagePayload = {
  message: string;
  topicId: string;
  circleId: string;
  mediaUrl?: string;
  mentionedUserIds?: string[];
};

export function TopicMessageBar() {
  const [message, setMessage] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [image, setImage] = useState<File>();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [commandMenuSelectedIndex, setCommandMenuSelectedIndex] = useState(0);
  const [commandMenuDismissed, setCommandMenuDismissed] = useState(false);
  const [mentionMenuSelectedIndex, setMentionMenuSelectedIndex] = useState(0);
  const [mentionMenuDismissed, setMentionMenuDismissed] = useState(false);
  const [topicLinkMenuSelectedIndex, setTopicLinkMenuSelectedIndex] =
    useState(0);
  const [topicLinkMenuDismissed, setTopicLinkMenuDismissed] = useState(false);
  const [caretIndex, setCaretIndex] = useState(0);
  const [pendingCaretPosition, setPendingCaretPosition] = useState<
    number | null
  >(null);
  const self = useSelf();
  const { topicId, circleId, circleMembers, circleTopics } =
    useTopicMetaContext();
  const { getActiveMembersInCircle } = useActiveCircleMembers();
  const { scrollToBottom, isAtBottom, generatingCommand, setGeneratingCommand } =
    useTopicUiContext();
  const isGenerating = isUploadingImage || Boolean(generatingCommand);
  const isTim = parseCommand(generatingCommand ?? "")?.name === CommandName.Tim;
  const sendMessage = useSocketEmit<MessagePayload>(SocketEvent.SendMessage);

  // Only while the user is still typing the command word itself (no space
  // yet) -- "/gi" matches, "/giphy cats" doesn't, since at that point
  // they've moved on to the command's arguments.
  const commandToken = /^\/(\S*)$/.exec(message)?.[1];
  const matchingCommands =
    commandToken !== undefined
      ? COMMANDS.filter((command) =>
          command.tokens.some((token) =>
            token.startsWith(commandToken.toLowerCase())
          )
        )
      : [];
  const showCommandMenu =
    !commandMenuDismissed && !isGenerating && matchingCommands.length > 0;

  useEffect(() => {
    setCommandMenuSelectedIndex(0);
    setCommandMenuDismissed(false);
  }, [commandToken]);

  const selectCommand = (command: CommandInfo) => {
    setMessage(`/${command.tokens[0]} `);
    textAreaRef.current?.focus();
  };

  // Only while typing the mention word itself: "@" preceded by start-of-
  // string or whitespace, with no whitespace since -- "@al" in "hey @al"
  // matches, but "email@example.com" (no leading whitespace before "@")
  // and "@al there" (already moved past it) don't.
  const mentionMatch = /(^|\s)@(\S*)$/.exec(message.slice(0, caretIndex));
  const mentionQuery = mentionMatch?.[2];
  const mentionStart = mentionMatch
    ? mentionMatch.index + mentionMatch[1].length
    : undefined;

  const onlineMemberIds = new Set(
    getActiveMembersInCircle(circleId).map((u) => u.id)
  );

  const matchingMembers: MentionCandidate[] =
    mentionQuery === undefined
      ? []
      : circleMembers
          .filter((member) => member.id !== self.id && member.name)
          .filter((member) => {
            if (!mentionQuery) return true;
            const query = mentionQuery.toLowerCase();
            return member
              .name!.toLowerCase()
              .split(" ")
              .some((part) => part.startsWith(query));
          })
          .map((member) => ({
            id: member.id,
            name: member.name!,
            imageUrl: member.imageUrl,
            isOnline: onlineMemberIds.has(member.id),
          }))
          .sort((a, b) => {
            if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
  const showMentionMenu =
    !mentionMenuDismissed && !isGenerating && matchingMembers.length > 0;

  useEffect(() => {
    setMentionMenuSelectedIndex(0);
    setMentionMenuDismissed(false);
  }, [mentionQuery, mentionStart]);

  // Same trigger shape as the mention match above, but for "#": only while
  // typing the topic word itself, no whitespace since the "#".
  const topicMatch = /(^|\s)#(\S*)$/.exec(message.slice(0, caretIndex));
  const topicQuery = topicMatch?.[2];
  const topicStart = topicMatch
    ? topicMatch.index + topicMatch[1].length
    : undefined;

  const matchingTopics: TopicLinkCandidate[] =
    topicQuery === undefined
      ? []
      : circleTopics
          .filter((topic) => {
            if (!topicQuery) return true;
            const query = topicQuery.toLowerCase();
            return topic.name
              .toLowerCase()
              .split(" ")
              .some((part) => part.startsWith(query));
          })
          .map((topic) => ({ id: topic.id, name: topic.name }))
          .sort((a, b) =>
            stripLeadingEmoji(a.name).localeCompare(stripLeadingEmoji(b.name))
          );
  const showTopicLinkMenu =
    !topicLinkMenuDismissed && !isGenerating && matchingTopics.length > 0;

  useEffect(() => {
    setTopicLinkMenuSelectedIndex(0);
    setTopicLinkMenuDismissed(false);
  }, [topicQuery, topicStart]);

  const selectMention = (member: MentionCandidate) => {
    if (mentionStart === undefined) return;

    // First name only -- that's the display name everywhere else in the
    // app (sender names, notifications), so a mention should read the same
    // way. Two members can share a first name; we accept that ambiguity
    // (avatar + context disambiguates) rather than showing a full name.
    const insertion = `@${getDisplayName(member.name)} `;
    const newMessage =
      message.slice(0, mentionStart) + insertion + message.slice(caretIndex);

    setMessage(newMessage);
    setPendingCaretPosition(mentionStart + insertion.length);
  };

  const selectTopicLink = (topic: TopicLinkCandidate) => {
    if (topicStart === undefined) return;

    const insertion = `#${topic.name} `;
    const newMessage =
      message.slice(0, topicStart) + insertion + message.slice(caretIndex);

    setMessage(newMessage);
    setPendingCaretPosition(topicStart + insertion.length);
  };

  // Selecting a mention rewrites `message` with the inserted "@Name ", so
  // the caret needs to move to just after it -- done as an effect (not
  // inline in selectMention) because the textarea's DOM value must catch
  // up to the new React state before setSelectionRange has anywhere valid
  // to point.
  useEffect(() => {
    if (pendingCaretPosition === null) return;

    textAreaRef.current?.focus();
    textAreaRef.current?.setSelectionRange(
      pendingCaretPosition,
      pendingCaretPosition
    );
    setCaretIndex(pendingCaretPosition);
    setPendingCaretPosition(null);
  }, [pendingCaretPosition]);

  const { uploadProgress } = useUploadProgres({
    file: image,
    isUploading: isUploadingImage,
  });
  const uploadText = uploadProgress >= 100 ? "FINALIZING..." : "UPLOADING...";

  const mediaBlobUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : undefined),
    [image]
  );

  // Focus textarea when command generation completes
  useEffect(() => {
    if (!generatingCommand) textAreaRef.current?.focus();
  }, [generatingCommand]);

  const emitMessage = async (message: string) => {
    if (!image && !message.trim()) return;
    let _media = image ?? extractImageFromMessage(message);
    const youtubeVideo = getYoutubeVideoFromUrl(message);
    const twitchStream = getTwitchStreamFromUrl(message);

    let _message = message;
    let mediaUrl = undefined;

    if (youtubeVideo) {
      mediaUrl = youtubeVideo.videoUrl;
    }

    if (twitchStream) {
      mediaUrl = twitchStream.videoUrl;
    }

    if (isValidCommand(message)) {
      setGeneratingCommand(message);
    }

    if (_media) {
      setIsUploadingImage(true);

      const uri =
        typeof _media === "string"
          ? _media
          : ((await toBase64(_media)) as string);

      _message = _message.replaceAll(uri, "");
      const resp = await uploadMedia({ file: uri });
      if (resp) mediaUrl = resp.mediaUrl;

      setIsUploadingImage(false);
    }

    // Matches against first names (see selectMention) -- if two members
    // share one, a "@FirstName" mention notifies both rather than neither.
    const mentionedUserIds = circleMembers
      .filter(
        (member) =>
          member.id !== self.id &&
          member.name &&
          message.includes(`@${getDisplayName(member.name)}`)
      )
      .map((member) => member.id);

    sendMessage.emit({
      message: _message,
      topicId,
      circleId,
      mediaUrl,
      mentionedUserIds,
    });

    setMessage("");
    setImage(undefined);
  };

  useUserTypingEmitter({ topicId, message });

  // Feeds the live highlight overlay -- same display-name/topic-name
  // vocabulary the dropdowns above insert and message-text.tsx recognizes
  // once sent, so what lights up while typing matches what becomes a link.
  const mentionNames = useMemo(
    () =>
      circleMembers
        .filter((member) => member.name)
        .map((member) => getDisplayName(member.name!)),
    [circleMembers]
  );
  const topicNames = useMemo(
    () => circleTopics.map((topic) => topic.name),
    [circleTopics]
  );

  return (
    <div className="p-3">
      <div className="relative shadow-sm rounded-md border border-input bg-transparent shadow-sm">
        {showCommandMenu && (
          <CommandAutocomplete
            commands={matchingCommands}
            selectedIndex={commandMenuSelectedIndex}
            onHover={setCommandMenuSelectedIndex}
            onSelect={selectCommand}
          />
        )}
        {showMentionMenu && (
          <MentionAutocomplete
            members={matchingMembers}
            selectedIndex={mentionMenuSelectedIndex}
            onHover={setMentionMenuSelectedIndex}
            onSelect={selectMention}
          />
        )}
        {showTopicLinkMenu && (
          <TopicLinkAutocomplete
            topics={matchingTopics}
            selectedIndex={topicLinkMenuSelectedIndex}
            onHover={setTopicLinkMenuSelectedIndex}
            onSelect={selectTopicLink}
          />
        )}
        <div
          className={cn(
            "flex items-center rounded-md",
            isGenerating ? "bg-slate-100 dark:bg-slate-900" : ""
          )}
        >
          <div className="relative min-w-0 flex-1">
            <MessageHighlightOverlay
              text={message}
              mentionNames={mentionNames}
              topicNames={topicNames}
            />
            <AutoResizeTextarea
              ref={textAreaRef}
              onPaste={(event) => {
                const items = event.clipboardData?.items;
                if (!items) return;

                for (const key in items) {
                  const item = items[key];

                  if (item.kind === "file") {
                    const blob = item.getAsFile();
                    if (blob) setImage(blob);
                  }
                }
              }}
              disabled={isGenerating}
              className="relative border-none bg-transparent text-transparent caret-[hsl(var(--foreground))]"
              onChange={(e) => {
                setMessage(e.target.value);
                setCaretIndex(
                  e.target.selectionStart ?? e.target.value.length
                );
              }}
              onSelect={(e) => {
                setCaretIndex(e.currentTarget.selectionStart ?? 0);
              }}
              onKeyDown={(e) => {
                if (showCommandMenu) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCommandMenuSelectedIndex(
                      (i) => (i + 1) % matchingCommands.length
                    );
                    return;
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCommandMenuSelectedIndex(
                      (i) =>
                        (i - 1 + matchingCommands.length) %
                        matchingCommands.length
                    );
                    return;
                  }

                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    selectCommand(matchingCommands[commandMenuSelectedIndex]);
                    return;
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();
                    setCommandMenuDismissed(true);
                    return;
                  }
                } else if (showMentionMenu) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setMentionMenuSelectedIndex(
                      (i) => (i + 1) % matchingMembers.length
                    );
                    return;
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setMentionMenuSelectedIndex(
                      (i) =>
                        (i - 1 + matchingMembers.length) %
                        matchingMembers.length
                    );
                    return;
                  }

                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    selectMention(matchingMembers[mentionMenuSelectedIndex]);
                    return;
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();
                    setMentionMenuDismissed(true);
                    return;
                  }
                } else if (showTopicLinkMenu) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setTopicLinkMenuSelectedIndex(
                      (i) => (i + 1) % matchingTopics.length
                    );
                    return;
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setTopicLinkMenuSelectedIndex(
                      (i) =>
                        (i - 1 + matchingTopics.length) % matchingTopics.length
                    );
                    return;
                  }

                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    selectTopicLink(
                      matchingTopics[topicLinkMenuSelectedIndex]
                    );
                    return;
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();
                    setTopicLinkMenuDismissed(true);
                    return;
                  }
                }

                if (e.key === "Enter" && !e.shiftKey) {
                  emitMessage(message);
                }
              }}
              value={message}
              placeholder={generatingCommand}
            />
          </div>
          {isGenerating && Boolean(generatingCommand) && isTim && (
            <div className="flex items-center pr-2">
              <ThinkingDots />
            </div>
          )}
          <div className="flex pr-1 items-center">
            <MediaUploader
              disabled={isGenerating}
              file={image}
              onFileChange={(file) => {
                setImage(file);
                // The composer growing to show the attachment preview can
                // push the last message out of view -- keep it visible,
                // but only if the user was already caught up.
                if (isAtBottom) scrollToBottom({ behavior: "instant" });
                textAreaRef.current?.focus();
              }}
              onFileRemove={() => setImage(undefined)}
            />

            <EmojiPicker
              disabled={isGenerating}
              onEmojiSelect={(emoji) => {
                const i = textAreaRef.current?.selectionStart;

                setMessage(message.slice(0, i) + emoji + message.slice(i));
                textAreaRef.current?.focus();
              }}
            />
          </div>
        </div>

        {image && (
          <div
            className={`p-2 border-t flex flex-col gap-2 ${
              isUploadingImage ? "bg-secondary" : ""
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-sm">{image.name}</span>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setImage(undefined)}
                disabled={isUploadingImage}
              >
                <CrossCircledIcon />
              </Button>
            </div>
            <MediaViewer url={mediaBlobUrl ?? ""} />
            {isUploadingImage && (
              <>
                <span className="text-xs">{uploadText}</span>
                <Progress value={uploadProgress} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
