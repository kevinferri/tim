"use client";

import { useQueryClient } from "@tanstack/react-query";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import {
  HighlightAddedPayload,
  HighlightRemovedPayload,
  updateSingleMessageCache,
  withHighlightAdded,
  withHighlightRemoved,
} from "@/components/topics/provider/topic-query-cache";

// No-op unless a standalone `["message", messageId]` cache entry exists --
// irrelevant when the modal shows a message already covered by the current
// topic's own caches.
export function useMessageHighlightSync(messageId?: string | null) {
  const queryClient = useQueryClient();

  useSocketHandler<HighlightAddedPayload>(
    SocketEvent.AddedHighlight,
    (payload) => {
      if (!messageId) return;
      updateSingleMessageCache(
        queryClient,
        messageId,
        withHighlightAdded(payload),
      );
    },
    !messageId,
  );

  useSocketHandler<HighlightRemovedPayload>(
    SocketEvent.RemovedHighlight,
    (payload) => {
      if (!messageId) return;
      updateSingleMessageCache(
        queryClient,
        messageId,
        withHighlightRemoved(payload),
      );
    },
    !messageId,
  );
}
