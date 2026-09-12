"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Highlight, User } from "@prisma/client";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { updateSingleMessageCache } from "@/components/topics/provider/topic-query-cache";

// No-op unless a standalone `["message", messageId]` cache entry exists --
// irrelevant when the modal shows a message already covered by the current
// topic's own caches.
export function useMessageHighlightSync(messageId?: string | null) {
  const queryClient = useQueryClient();

  useSocketHandler<{ highlight: Highlight; createdBy: User }>(
    SocketEvent.AddedHighlight,
    ({ highlight, createdBy }) => {
      if (!messageId || highlight.messageId !== messageId) return;

      updateSingleMessageCache(queryClient, messageId, (prev) => ({
        ...prev,
        highlights: [
          ...(prev.highlights ?? []),
          { id: highlight.id, userId: highlight.userId, createdBy },
        ],
      }));
    },
    !messageId,
  );

  useSocketHandler<{ messageId: string; userId: string }>(
    SocketEvent.RemovedHighlight,
    (payload) => {
      if (!messageId || payload.messageId !== messageId) return;

      updateSingleMessageCache(queryClient, messageId, (prev) => ({
        ...prev,
        highlights: (prev.highlights ?? []).filter(
          ({ userId }) => userId !== payload.userId,
        ),
      }));
    },
    !messageId,
  );
}
