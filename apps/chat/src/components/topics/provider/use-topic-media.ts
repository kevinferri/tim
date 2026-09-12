import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, skipToken } from "@tanstack/react-query";
import { MessageProps, MessageData } from "@/components/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import {
  mediaMessagesQueryKey,
  updateMessagesCache,
} from "@/components/topics/provider/topic-query-cache";

type UseTopicMediaProps = {
  topicId: string;
  existingMediaMessages: MessageData[];
};

export function useTopicMedia({
  topicId,
  existingMediaMessages,
}: UseTopicMediaProps) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => mediaMessagesQueryKey(topicId), [topicId]);

  // Socket-only state seeded from SSR props (skipToken means no queryFn
  // runs), kept in react-query's cache so cross-updates share setQueryData;
  // initialData guarantees data is never actually undefined despite
  // skipToken's type.
  const { data: mediaMessages } = useQuery({
    queryKey,
    queryFn: skipToken,
    initialData: existingMediaMessages as MessageProps[],
  }) as { data: MessageProps[] };

  const setMediaMessages = useCallback(
    (updater: (prev: MessageProps[]) => MessageProps[]) => {
      queryClient.setQueryData<MessageProps[]>(queryKey, (prev) =>
        updater(prev ?? []),
      );
    },
    [queryClient, queryKey],
  );

  const [shufflingGifs, setShufflingGifs] = useState<string[]>([]);

  const addShufflingGif = useCallback((messageId: string) => {
    setShufflingGifs((prev) =>
      prev.includes(messageId) ? prev : [...prev, messageId],
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

      // Patches the message's mediaUrl in the main chat history cache
      // directly -- no callback threading needed since both live in
      // react-query's cache.
      updateMessagesCache(queryClient, topicId, updateHandler);
      setMediaMessages(updateHandler);
      setShufflingGifs((prev) => prev.filter((id) => id !== payload.messageId));
    },
  );

  return {
    mediaMessages,
    setMediaMessages,
    shufflingGifs,
    addShufflingGif,
  };
}
