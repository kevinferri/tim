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

  // No backing fetch endpoint -- this is socket-only local state, seeded
  // from SSR props (`skipToken` means react-query never calls a queryFn
  // for it). It lives in react-query's cache anyway so message/media/
  // highlight cross-updates can all go through the same setQueryData
  // mechanism instead of three different state containers.
  // `skipToken` types `data` as possibly undefined, but `initialData`
  // guarantees it's never actually undefined at runtime.
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

      // Patch the message's `mediaUrl` wherever else it's cached (main
      // chat history) directly -- no callback threading needed now that
      // both live in react-query's cache.
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
