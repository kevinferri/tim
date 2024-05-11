"use client";

import { ChangeEvent, useState } from "react";

import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";
import { MediaUploader } from "@/topics/media-uploader";
import { uploadMedia } from "@/actions/media";
import { MediaViewer } from "@/topics/media-viewer";
import { Button } from "@/components/ui/button";
import { CrossCircledIcon } from "@radix-ui/react-icons";
import { Progress } from "@/components/ui/progress";
import { useUploadProgres } from "@/topics/use-upload-progress";

type MessagePayload = {
  message: string;
  topicId: string;
  mediaUrl?: string;
};

function toBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

function adjustHeight(target: ChangeEvent<HTMLTextAreaElement>["target"]) {
  target.style.height = "";
  target.style.height = `${target.scrollHeight + 0.5}px`;
}

export function TopicMessageBar() {
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<File>();
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const { topicId } = useCurrentTopicContext();
  const { uploadProgress } = useUploadProgres({ media, isUploadingMedia });
  const sendMessage = useSocketEmit<MessagePayload>(SocketEvent.SendMessage);

  const emitMessage = async (message: string) => {
    if (!message.trim()) return;
    let mediaUrl = undefined;

    if (media) {
      setIsUploadingMedia(true);

      const uri = (await toBase64(media)) as string;
      const resp = await uploadMedia({ file: uri });

      if (resp) mediaUrl = resp.mediaUrl;

      setIsUploadingMedia(false);
    }

    sendMessage.emit({
      message,
      topicId,
      mediaUrl,
    });

    setMessage("");
    setMedia(undefined);
  };

  return (
    <div className="p-4">
      <div className="shadow-sm rounded-md border border-input bg-transparent shadow-sm">
        <div className="flex items-center">
          <Textarea
            disabled={isUploadingMedia}
            rows={1}
            autoFocus
            className="focus-visible:ring-transparent focus-visible:transparent border-none resize-none text-base shadow-none"
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                emitMessage(message);
                e.currentTarget.style.height = "";
              }
            }}
            value={message}
          />
          <div className="pr-1">
            <MediaUploader
              file={media}
              onFileChange={(file) => setMedia(file)}
              onFileRemove={() => setMedia(undefined)}
            />
          </div>
        </div>

        {media && (
          <div
            className={`p-2 border-t flex flex-col gap-1 ${
              isUploadingMedia ? "bg-secondary" : ""
            }`}
          >
            <div className="flex items-center gap-1">
              <code className="text-sm">{media.name}</code>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setMedia(undefined)}
                disabled={isUploadingMedia}
              >
                <CrossCircledIcon />
              </Button>
            </div>
            <MediaViewer url={URL.createObjectURL(media)} />
            {isUploadingMedia && <Progress value={uploadProgress} />}
          </div>
        )}
      </div>
    </div>
  );
}
