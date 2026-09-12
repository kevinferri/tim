"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Highlight, User } from "@prisma/client";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { updateUserStatsTopHighlightsCache } from "@/components/topics/provider/topic-query-cache";

// Mounted exactly once -- patches every cached `["user-stats", topicId, userId]` entry in one pass via a partial query-key match, so it doesn't need to run once per avatar on screen.
export function useUserStatsHighlightSync() {
  const queryClient = useQueryClient();

  useSocketHandler<{ highlight: Highlight; createdBy: User }>(
    SocketEvent.AddedHighlight,
    ({ highlight, createdBy }) => {
      updateUserStatsTopHighlightsCache(queryClient, (prev) =>
        prev.map((message) =>
          message.id !== highlight.messageId
            ? message
            : {
                ...message,
                highlights: [
                  ...(message.highlights ?? []),
                  { id: highlight.id, userId: highlight.userId, createdBy },
                ],
              },
        ),
      );
    },
  );

  useSocketHandler<{ messageId: string; userId: string }>(
    SocketEvent.RemovedHighlight,
    (payload) => {
      updateUserStatsTopHighlightsCache(queryClient, (prev) =>
        prev.map((message) =>
          message.id !== payload.messageId
            ? message
            : {
                ...message,
                highlights: (message.highlights ?? []).filter(
                  ({ userId }) => userId !== payload.userId,
                ),
              },
        ),
      );
    },
  );
}
