import { QueryClient, InfiniteData } from "@tanstack/react-query";
import { MessageData, MessageProps } from "@/components/topics/message";
import { UserStatsForTopicResponse } from "@/app/api/topics/[topicId]/user-stats/[userId]/route";

export type MessagesData = InfiniteData<MessageProps[], string | undefined>;

// replyCount is shared by every message in a flat thread, so adding or removing
// a reply has to move all of them -- including a root already paginated onto an
// older page. `excludeId` skips the message being added, which starts at 0.
export function adjustReplyCounts(
  pages: MessageProps[][],
  threadRootId: string,
  delta: number,
  excludeId?: string,
) {
  const inThread = (m: MessageProps) =>
    m.id === threadRootId || m.threadRootId === threadRootId;

  const existing = pages
    .flat()
    .find((m) => m.id !== excludeId && inThread(m) && m.replyCount != null);

  const next = Math.max(0, (existing?.replyCount ?? 0) + delta);

  return pages.map((page) =>
    page.map((m) => (inThread(m) ? { ...m, replyCount: next } : m)),
  );
}

export function messagesQueryKey(topicId: string) {
  return ["messages", topicId];
}

export function mediaMessagesQueryKey(topicId: string) {
  return ["media-messages", topicId];
}

export function threadQueryKey(topicId: string, threadRootId: string) {
  return ["thread", topicId, threadRootId];
}

// Partial key match: a topic can have any thread open, and the socket
// handlers that fan out here don't know which root that is.
export function updateThreadCache(
  queryClient: QueryClient,
  topicId: string,
  updater: (prev: MessageProps[]) => MessageProps[],
) {
  queryClient.setQueriesData<MessageProps[]>(
    { queryKey: ["thread", topicId] },
    (prev) => (prev ? updater(prev) : prev),
  );
}

function singleMessageQueryKey(messageId: string) {
  return ["message", messageId];
}

// Only safe for length-preserving updaters (map, never filter/insert) --
// rebucketing below re-splits the result using each page's original size.
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

// A message fetched standalone via /api/message/:id lives outside any
// topic's paginated cache -- this keeps that entry live too (e.g. an old
// permalinked message not currently loaded).
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

// Uses a partial query-key match since a highlight event may need to update
// a cached user-stats entry for a topic other than the one currently open.
export function updateUserStatsTopHighlightsCache(
  queryClient: QueryClient,
  updater: (prev: MessageData[]) => MessageData[],
) {
  queryClient.setQueriesData<UserStatsForTopicResponse>(
    { queryKey: ["user-stats"] },
    (prev) =>
      prev ? { ...prev, topHighlights: updater(prev.topHighlights) } : prev,
  );
}
