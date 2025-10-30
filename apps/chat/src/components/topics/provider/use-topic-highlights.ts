import { useState, useMemo } from "react";
import { MessageProps, MessageData } from "@/components/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { Highlight, User } from "@prisma/client";
import { useLazyFetch } from "@/lib/hooks/use-fetch";
import { sanitizeTopHighlights } from "./utils";

type UseTopicHighlightsProps = {
  topicId: string;
  existingTopHighlights: MessageData[];
  topHighlightsLimit: number;
  onHighlightChange?: (
    handler: (prev: MessageProps[]) => MessageProps[]
  ) => void;
};

export function useTopicHighlights({
  topicId,
  existingTopHighlights,
  topHighlightsLimit,
  onHighlightChange,
}: UseTopicHighlightsProps) {
  const [topHighlights, setTopHighlights] = useState<MessageProps[]>(
    existingTopHighlights as MessageProps[]
  );

  const { fetchData: refreshTopHighlights } = useLazyFetch<MessageProps[]>({
    url: `/api/topics/${topicId}/top-highlights`,
    onSuccess: (refreshed) => setTopHighlights(refreshed),
  });

  const visibleTopHighlights = useMemo(
    () => sanitizeTopHighlights(topHighlights, topHighlightsLimit),
    [topHighlights, topHighlightsLimit]
  );

  useSocketHandler<{ highlight: Highlight; createdBy: User }>(
    SocketEvent.AddedHighlight,
    ({ highlight, createdBy }) => {
      const isAlreadyTopHighlight = topHighlights.some(
        ({ id }) => highlight.messageId === id
      );

      const lowestTopHighlights =
        topHighlights.length > 0
          ? topHighlights[topHighlights.length - 1]?.highlights?.length ?? 0
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

      onHighlightChange?.(updateMessages);

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
    }
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
              ({ userId }) => userId !== payload.userId
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

      onHighlightChange?.(updateHandler);

      if (toBeRemovedFromTopHighlights) {
        setTopHighlights((prev) => {
          const wasTopHighlight = prev.some(
            ({ id }) => toBeRemovedFromTopHighlights === id
          );

          if (!wasTopHighlight) {
            return updateHandler(prev);
          }

          const filtered = prev.filter(
            ({ id }) => id !== toBeRemovedFromTopHighlights
          );

          if (topHighlights.length >= topHighlightsLimit) {
            refreshTopHighlights();
          }

          return updateHandler(filtered);
        });
      } else {
        setTopHighlights((prev) => updateHandler(prev));
      }
    }
  );

  return {
    topHighlights: visibleTopHighlights,
    setTopHighlights,
    refreshTopHighlights,
  };
}
