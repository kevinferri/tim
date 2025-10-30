import { useState, useCallback } from "react";
import { MessageProps, MessageData } from "@/components/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";

type UseTopicMediaProps = {
  existingMediaMessages: MessageData[];
  onMediaChange?:
    | ((handler: (prev: MessageProps[]) => MessageProps[]) => void)
    | undefined;
};

export function useTopicMedia({
  existingMediaMessages,
  onMediaChange,
}: UseTopicMediaProps) {
  const [mediaMessages, setMediaMessages] = useState<MessageProps[]>(
    existingMediaMessages as MessageProps[]
  );
  const [shufflingGifs, setShufflingGifs] = useState<string[]>([]);

  const addShufflingGif = useCallback((messageId: string) => {
    setShufflingGifs((prev) =>
      prev.includes(messageId) ? prev : [...prev, messageId]
    );
  }, []);

  useSocketHandler<{ messageId: string; mediaUrl: string }>(
    SocketEvent.ShuffleGifMessage,
    (payload) => {
      const updateHandler = (prevMessages: MessageProps[]) =>
        prevMessages.map((m) => {
          if (m.id === payload.messageId) {
            return { ...m, mediaUrl: payload.mediaUrl };
          }
          return m;
        });

      onMediaChange?.(updateHandler);
      setMediaMessages((prev) => updateHandler(prev));
      setShufflingGifs((prev) => prev.filter((id) => id !== payload.messageId));
    }
  );

  return {
    mediaMessages,
    setMediaMessages,
    shufflingGifs,
    addShufflingGif,
  };
}
