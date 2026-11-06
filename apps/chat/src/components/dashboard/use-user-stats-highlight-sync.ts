"use client";

import { useQueryClient } from "@tanstack/react-query";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import {
  HighlightAddedPayload,
  HighlightRemovedPayload,
  updateUserStatsTopHighlightsCache,
  withHighlightAdded,
  withHighlightRemoved,
} from "@/components/topics/provider/topic-query-cache";

// Mounted exactly once -- patches every cached `["user-stats", topicId, userId]` entry in one pass via a partial query-key match, so it doesn't need to run once per avatar on screen.
export function useUserStatsHighlightSync() {
  const queryClient = useQueryClient();

  useSocketHandler<HighlightAddedPayload>(
    SocketEvent.AddedHighlight,
    (payload) => {
      const patch = withHighlightAdded(payload);
      updateUserStatsTopHighlightsCache(queryClient, (prev) => prev.map(patch));
    },
  );

  useSocketHandler<HighlightRemovedPayload>(
    SocketEvent.RemovedHighlight,
    (payload) => {
      const patch = withHighlightRemoved(payload);
      updateUserStatsTopHighlightsCache(queryClient, (prev) => prev.map(patch));
    },
  );
}
