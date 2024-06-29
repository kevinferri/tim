"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";
import { MediaUploader } from "@/topics/media-uploader";
import { uploadMedia } from "@/actions/media";
import {
  MediaViewer,
  extractMediaFromMessage,
  getYoutubeVideoFromUrl,
} from "@/topics/media-viewer";
import { Button } from "@/components/ui/button";
import { CrossCircledIcon } from "@radix-ui/react-icons";
import { Progress } from "@/components/ui/progress";
import { useUploadProgres } from "@/topics/use-upload-progress";
import { usePrevious } from "@/lib/hooks";
import { AutoResizeTextarea } from "@/topics/auto-resize-textarea";

type MessagePayload = {
  message: string;
  topicId: string;
  mediaUrl?: string;
};

type TypingPayload = {
  topicId: string;
};

function toBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

export function TopicMessageBar() {
  const [message, setMessage] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [media, setMedia] = useState<File>();
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const { topicId, scrollToBottomOfChat } = useCurrentTopicContext();
  const { uploadProgress } = useUploadProgres({
    media,
    isUploadingMedia,
  });
  const sendMessage = useSocketEmit<MessagePayload>(SocketEvent.SendMessage);
  const startedTyping = useSocketEmit<TypingPayload>(
    SocketEvent.UserStartedTyping
  );
  const stoppedTyping = useSocketEmit<TypingPayload>(
    SocketEvent.UserStoppedTyping
  );
  const uploadText = uploadProgress >= 100 ? "FINALIZING..." : "UPLOADING...";
  const previousMessage = usePrevious(message);
  const mediaBlobUrl = useMemo(
    () => (media ? URL.createObjectURL(media) : undefined),
    [media]
  );

  const emitMessage = async (message: string) => {
    if (!media && !message.trim()) return;
    let _media = media ?? extractMediaFromMessage(message);
    const youtubeVideo = getYoutubeVideoFromUrl(message);
    let _message = message;
    let mediaUrl = undefined;

    if (youtubeVideo) {
      mediaUrl = youtubeVideo.videoUrl;
    }

    if (_media) {
      setIsUploadingMedia(true);

      const uri =
        typeof _media === "string"
          ? _media
          : ((await toBase64(_media)) as string);

      _message = _message.replaceAll(uri, "");
      const resp = await uploadMedia({ file: uri });
      if (resp) mediaUrl = resp.mediaUrl;

      setIsUploadingMedia(false);
    }

    sendMessage.emit({
      message: _message,
      topicId,
      mediaUrl,
    });

    setMessage("");
    setMedia(undefined);
  };

  useEffect(() => {
    if (previousMessage?.length === 0 && message.length > 0) {
      startedTyping.emit({ topicId });
      return;
    }

    if (previousMessage && previousMessage.length > 0 && message.length === 0) {
      stoppedTyping.emit({ topicId });
      return;
    }
  }, [message.length, previousMessage, startedTyping, stoppedTyping, topicId]);

  return (
    <div className="p-3">
      <div className="shadow-sm rounded-md border border-input bg-transparent shadow-sm">
        <div className="flex items-center">
          <AutoResizeTextarea
            ref={textAreaRef}
            onPaste={(event) => {
              const items = event.clipboardData?.items;
              if (!items) return;

              for (const key in items) {
                const item = items[key];

                if (item.kind === "file") {
                  const blob = item.getAsFile();
                  if (blob) setMedia(blob);
                }
              }
            }}
            disabled={isUploadingMedia}
            className="border-none"
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                emitMessage(message);
              }
            }}
            value={message}
          />
          <div className="pr-1">
            <MediaUploader
              disabled={isUploadingMedia}
              file={media}
              onFileChange={(file) => {
                setMedia(file);
                scrollToBottomOfChat(250);
                textAreaRef.current?.focus();
              }}
              onFileRemove={() => setMedia(undefined)}
            />
          </div>
        </div>

        {media && (
          <div
            className={`p-2 border-t flex flex-col gap-2 ${
              isUploadingMedia ? "bg-secondary" : ""
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-sm">{media.name}</span>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setMedia(undefined)}
                disabled={isUploadingMedia}
              >
                <CrossCircledIcon />
              </Button>
            </div>
            <MediaViewer url={mediaBlobUrl ?? ""} />
            {isUploadingMedia && (
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
