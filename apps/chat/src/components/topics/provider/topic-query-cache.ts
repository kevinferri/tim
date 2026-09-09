import { QueryClient, InfiniteData } from "@tanstack/react-query";
import { MessageProps } from "@/components/topics/message";

export type MessagesData = InfiniteData<MessageProps[], string | undefined>;

export function messagesQueryKey(topicId: string) {
  return ["messages", topicId];
}

export function mediaMessagesQueryKey(topicId: string) {
  return ["media-messages", topicId];
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
