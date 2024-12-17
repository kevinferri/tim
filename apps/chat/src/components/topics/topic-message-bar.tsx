"use client";

import { useMemo, useRef, useState } from "react";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { useCurrentTopicContext } from "@/components/topics/current-topic-provider";
import { MediaUploader } from "@/components/topics/media-uploader";
import { uploadMedia } from "@/actions/media";
import { MediaViewer } from "@/components/topics/media-viewer";
import { Button } from "@/components/ui/button";
import { CrossCircledIcon } from "@radix-ui/react-icons";
import { Progress } from "@/components/ui/progress";
import { useUploadProgres } from "@/components/topics/use-upload-progress";
import { useUserTypingEmitter } from "@/lib/hooks";
import { AutoResizeTextarea } from "@/components/topics/auto-resize-textarea";
import { cn, toBase64 } from "@/lib/utils";
import { EmojiPicker } from "@/components/topics/emoji-picker";
import {
  extractImageFromMessage,
  getTwitchStreamFromUrl,
  getYoutubeVideoFromUrl,
  isValidCommand,
} from "@/components/topics/message-utils";

type MessagePayload = {
  message: string;
  topicId: string;
  circleId: string;
  mediaUrl?: string;
};

export function TopicMessageBar() {
  const [message, setMessage] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [image, setImage] = useState<File>();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const {
    topicId,
    scrollToBottomOfChat,
    circleId,
    generatingCommand,
    setGeneratingCommand,
  } = useCurrentTopicContext();
  const isGenerating = isUploadingImage || Boolean(generatingCommand);
  const sendMessage = useSocketEmit<MessagePayload>(SocketEvent.SendMessage);
  const { uploadProgress } = useUploadProgres({
    file: image,
    isUploading: isUploadingImage,
  });
  const uploadText = uploadProgress >= 100 ? "FINALIZING..." : "UPLOADING...";

  const mediaBlobUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : undefined),
    [image]
  );

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

    sendMessage.emit({
      message: _message,
      topicId,
      circleId,
      mediaUrl,
    });

    setMessage("");
    setImage(undefined);
  };

  useUserTypingEmitter({ topicId, message });

  return (
    <div className="p-3">
      <div className="shadow-sm rounded-md border border-input bg-transparent shadow-sm">
        <div
          className={cn(
            "flex items-center rounded-md",
            isGenerating ? "bg-slate-100 dark:bg-slate-900" : ""
          )}
        >
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
            className={cn(
              "border-none",
              isGenerating ? "bg-slate-100 dark:bg-slate-900" : ""
            )}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                emitMessage(message);
              }
            }}
            value={message}
            placeholder={generatingCommand}
          />
          <div className="flex pr-1 items-center">
            <MediaUploader
              disabled={isGenerating}
              file={image}
              onFileChange={(file) => {
                setImage(file);
                scrollToBottomOfChat();
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
