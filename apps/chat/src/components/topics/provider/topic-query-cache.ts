import { QueryClient, InfiniteData } from "@tanstack/react-query";
import { MessageData, MessageProps } from "@/components/topics/message";
import { UserStatsForTopicResponse } from "@/app/api/topics/[topicId]/user-stats/[userId]/route";

export type MessagesData = InfiniteData<MessageProps[], string | undefined>;

export function messagesQueryKey(topicId: string) {
  return ["messages", topicId];
}

export function mediaMessagesQueryKey(topicId: string) {
  return ["media-messages", topicId];
}

export function singleMessageQueryKey(messageId: string) {
  return ["message", messageId];
}

// Applies a same-length, same-order map transform across every loaded
// page of a topic's paginated message cache. Lets socket handlers that
// live outside use-topic-messages.ts (highlights, media) patch a
// message's fields wherever it appears -- via setQueryData on this same
// cache entry -- instead of threading an update callback through
// CurrentTopicProvider. Only safe for length-preserving updaters (a
// `.map()`, never a filter/insert): the rebucketing below re-splits the
// result using each page's original size.
export function updateMessagesCache(
  queryClient: QueryClient,
  topicId: string,
  updater: (prev: MessageProps[]) => MessageProps[],
) {
  queryClient.setQueryData<MessagesData>(messagesQueryKey(topicId), (prev) => {
    if (!prev) return prev;

    const chronologicalPages = [...prev.pages].reverse();
    const sizes = chronologicalPages.map((page) => page.length);
    const updated = updater(chronologicalPages.flat());

    let offset = 0;
    const rebucketed = sizes.map((size) => {
      const page = updated.slice(offset, offset + size);
      offset += size;
      return page;
    });

    return { ...prev, pages: [...rebucketed].reverse() };
  });
}

export function updateMediaMessagesCache(
  queryClient: QueryClient,
  topicId: string,
  updater: (prev: MessageProps[]) => MessageProps[],
) {
  queryClient.setQueryData<MessageProps[]>(
    mediaMessagesQueryKey(topicId),
    (prev) => updater(prev ?? []),
  );
}

// A message fetched on its own via /api/message/:id (see message-modal.tsx)
// lives outside any topic's paginated cache -- this patches that standalone
// entry the same way the caches above get patched, so a message shown in
// isolation (e.g. an old permalinked message not currently loaded in the
// topic) still stays live for highlight events.
export function updateSingleMessageCache(
  queryClient: QueryClient,
  messageId: string,
  updater: (prev: MessageProps) => MessageProps,
) {
  queryClient.setQueryData<MessageProps>(
    singleMessageQueryKey(messageId),
    (prev) => (prev ? updater(prev) : prev),
  );
}

// Patches every cached `["user-stats", topicId, userId]` entry (the "top
// highlights" list in a user's profile sheet, see user-avatar.tsx) via a
// partial query-key match -- there's no single topicId/userId to key off
// of here, since a highlight event should update whichever of these are
// currently cached, possibly for a topic other than the one open right now.
export function updateUserStatsTopHighlightsCache(
  queryClient: QueryClient,
  updater: (prev: MessageData[]) => MessageData[],
) {
  queryClient.setQueriesData<UserStatsForTopicResponse>(
    { queryKey: ["user-stats"] },
    (prev) => (prev ? { ...prev, topHighlights: updater(prev.topHighlights) } : prev),
  );
}
