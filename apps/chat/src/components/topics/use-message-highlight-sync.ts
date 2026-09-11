"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Highlight, User } from "@prisma/client";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { updateSingleMessageCache } from "@/components/topics/provider/topic-query-cache";

// Keeps a standalone `["message", messageId]` cache entry (a message
// fetched on its own via /api/message/:id -- see message-modal.tsx) in
// sync with highlight events, the same way use-topic-highlights.ts does
// for a topic's own message caches. Only relevant when that entry exists
// at all, so this is a no-op whenever the modal is showing a message
// that's already covered by the current topic's own caches instead.
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
