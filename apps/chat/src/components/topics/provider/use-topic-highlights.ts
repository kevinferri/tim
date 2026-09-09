import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageProps, MessageData } from "@/components/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { Highlight, User } from "@prisma/client";
import {
  updateMessagesCache,
  updateMediaMessagesCache,
} from "@/components/topics/provider/topic-query-cache";

type UseTopicHighlightsProps = {
  topicId: string;
  existingTopHighlights: MessageData[];
  topHighlightsLimit: number;
};

function sanitizeTopHighlights(messages: MessageProps[], limit: number) {
  return [...messages]
    .sort((a, b) => {
      const bLen = b.highlights?.length ?? 0;
      const aLen = a.highlights?.length ?? 0;
      if (bLen === aLen) {
        return (
          new Date(b.createdAt ?? new Date()).getTime() -
          new Date(a.createdAt ?? new Date()).getTime()
        );
      }
      return bLen - aLen;
    })
    .slice(0, limit);
}

export function useTopicHighlights({
  topicId,
  existingTopHighlights,
  topHighlightsLimit,
}: UseTopicHighlightsProps) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["top-highlights", topicId], [topicId]);

  // Refresh-on-demand only (`refreshTopHighlights`) -- SSR already
  // provided the initial data, so this never fetches on mount.
  const { data: topHighlights, refetch: refreshTopHighlights } = useQuery({
    queryKey,
    queryFn: () =>
      fetch(`/api/topics/${topicId}/top-highlights`).then((r) => {
        if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
        return r.json() as Promise<MessageProps[]>;
      }),
    initialData: existingTopHighlights as MessageProps[],
    enabled: false,
  });

  const setTopHighlights = useCallback(
    (updater: (prev: MessageProps[]) => MessageProps[]) => {
      queryClient.setQueryData<MessageProps[]>(queryKey, (prev) =>
        updater(prev ?? []),
      );
    },
    [queryClient, queryKey],
  );

  const visibleTopHighlights = useMemo(
    () => sanitizeTopHighlights(topHighlights, topHighlightsLimit),
    [topHighlights, topHighlightsLimit],
  );

  useSocketHandler<{ highlight: Highlight; createdBy: User }>(
    SocketEvent.AddedHighlight,
    ({ highlight, createdBy }) => {
      const isAlreadyTopHighlight = topHighlights.some(
        ({ id }) => highlight.messageId === id,
      );

      const lowestTopHighlights =
        topHighlights.length > 0
          ? (topHighlights[topHighlights.length - 1]?.highlights?.length ?? 0)
          : 0;

      let potentialNewHighlight: MessageProps | null = null;

      const updateMessages = (prevMessages: MessageProps[]): MessageProps[] =>
        prevMessages.map((message) => {
          if (message.id !== highlight.messageId) {
            return message;
          }

          const updatedMessage: MessageProps = {
            ...message,
            highlights: [
              ...(message.highlights ?? []),
              {
                id: highlight.id,
                userId: highlight.userId,
                createdBy,
              },
            ],
          };

          if (
            !isAlreadyTopHighlight &&
            (lowestTopHighlights <= updatedMessage.highlights!.length ||
              topHighlights.length < topHighlightsLimit)
          ) {
            potentialNewHighlight = updatedMessage;
          }

          return updatedMessage;
        });

      // Patch the message's `highlights` field wherever else it's
      // cached (main chat history, media rail) directly -- no callback
      // threading needed now that both live in react-query's cache.
      updateMessagesCache(queryClient, topicId, updateMessages);
      updateMediaMessagesCache(queryClient, topicId, updateMessages);

      setTopHighlights((prev) => {
        const updated = updateMessages(prev);
        if (
          potentialNewHighlight &&
          !prev.some((m) => m.id === potentialNewHighlight!.id)
        ) {
          return [...updated, potentialNewHighlight];
        }
        return updated;
      });
    },
  );

  useSocketHandler<{ messageId: string; userId: string }>(
    SocketEvent.RemovedHighlight,
    (payload) => {
      let toBeRemovedFromTopHighlights: string | undefined = undefined;
      const lowestCount = topHighlights.length
        ? Math.min(...topHighlights.map((m) => m.highlights?.length ?? 0))
        : 0;

      const updateHandler = (prevMessages: MessageProps[]): MessageProps[] =>
        prevMessages.map((message) => {
          if (message.id !== payload.messageId) {
            return message;
          }

          const newMessage: MessageProps = {
            ...message,
            highlights: (message.highlights ?? []).filter(
              ({ userId }) => userId !== payload.userId,
            ),
          };

          if (
            newMessage.highlights!.length === 0 ||
            (lowestCount > newMessage.highlights!.length &&
              topHighlights.length >= topHighlightsLimit)
          ) {
            toBeRemovedFromTopHighlights = newMessage.id;
          }

          return newMessage;
        });

      updateMessagesCache(queryClient, topicId, updateHandler);
      updateMediaMessagesCache(queryClient, topicId, updateHandler);

      if (toBeRemovedFromTopHighlights) {
        setTopHighlights((prev) => {
          const wasTopHighlight = prev.some(
            ({ id }) => toBeRemovedFromTopHighlights === id,
          );

          if (!wasTopHighlight) {
            return updateHandler(prev);
          }

          const filtered = prev.filter(
            ({ id }) => id !== toBeRemovedFromTopHighlights,
          );

          if (topHighlights.length >= topHighlightsLimit) {
            refreshTopHighlights();
          }

          return updateHandler(filtered);
        });
      } else {
        setTopHighlights((prev) => updateHandler(prev));
      }
    },
  );

  return {
    topHighlights: visibleTopHighlights,
    setTopHighlights,
    refreshTopHighlights,
  };
}
