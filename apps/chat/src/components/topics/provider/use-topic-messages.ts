import { useCallback, useMemo, MutableRefObject } from "react";
import uniqBy from "lodash.uniqby";
import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { MessageProps, MessageData } from "@/components/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import {
  MessagesData,
  messagesQueryKey,
} from "@/components/topics/provider/topic-query-cache";

type UseTopicMessagesProps = {
  topicId: string;
  existingMessages: MessageData[];
  messagesLimit: number;
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  onNewMessage?: (message: MessageProps) => void;
  onMediaMessage?: (message: MessageProps) => void;
};

type MessagesPage = MessageProps[];

async function fetchMessagesPage(topicId: string, before?: string) {
  const resp = await fetch(
    `/api/topics/${topicId}/messages${before ? `?before=${before}` : ""}`,
  );

  if (!resp.ok) {
    throw new Error(`Request failed with status ${resp.status}`);
  }

  return (await resp.json()) as MessagesPage;
}

export function useTopicMessages({
  topicId,
  existingMessages,
  messagesLimit,
  viewportRef,
  isAtBottom,
  onNewMessage,
  onMediaMessage,
}: UseTopicMessagesProps) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => messagesQueryKey(topicId), [topicId]);

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) => fetchMessagesPage(topicId, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.length >= messagesLimit
          ? new Date(lastPage[0].createdAt ?? 0).toISOString()
          : undefined,
      initialData: {
        pages: [existingMessages as MessageProps[]],
        pageParams: [undefined],
      },
    });

  // pages[0] is the initial/live window (fetched with no `before` cursor,
  // i.e. the newest messages) -- each `fetchNextPage()` call appends an
  // older window to the end of the array as history is paged in. So the
  // array runs newest-page-first; flatten in reverse to get chronological
  // (oldest-first) render order.
  const pages = data?.pages;
  const messages = useMemo(
    () => [...(pages ?? [])].reverse().flat(),
    [pages],
  );

  useSocketHandler<MessageProps>(
    SocketEvent.SendMessage,
    (newMessage: MessageProps) => {
      if (newMessage.topicId !== topicId) {
        return;
      }

      const newMsg = {
        ...newMessage,
        createdAt: new Date(newMessage.createdAt ?? new Date()),
      };

      queryClient.setQueryData<MessagesData>(queryKey, (prev) => {
        if (!prev) return prev;

        // De-dup safety net for the append-on-socket-event path, which
        // isn't a queryFn react-query dedupes on its own.
        const withNew = uniqBy([...prev.pages[0], newMsg], "id");
        // Only trim the live window out of state while the user is at
        // the bottom -- trimming while they're scrolled up reading
        // history would yank content out from under them.
        const needsSlice = withNew.length > messagesLimit && isAtBottom;

        if (needsSlice) {
          const slicer = Math.max(withNew.length - messagesLimit, 0);
          // Drop whole older (already-loaded-history) pages too -- once
          // the live window itself has been trimmed, those pages are
          // stale relative to it and would leave a gap in the timeline
          // if kept. Trimming to exactly `messagesLimit` also keeps
          // `hasNextPage` correctly true afterward (same as today's
          // `setHasMoreMessages(true)`), since it's derived from this
          // page's length.
          return {
            ...prev,
            pages: [withNew.slice(slicer)],
            pageParams: [prev.pageParams[0]],
          };
        }

        return {
          ...prev,
          pages: [withNew, ...prev.pages.slice(1)],
        };
      });

      if (newMsg.mediaUrl) {
        onMediaMessage?.(newMsg);
      }

      onNewMessage?.(newMsg);
    },
  );

  useSocketHandler<{ deletedMessageId: string }>(
    SocketEvent.DeleteMessage,
    (payload) => {
      queryClient.setQueryData<MessagesData>(queryKey, (prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          pages: prev.pages.map((page) =>
            page.filter(({ id }) => id !== payload.deletedMessageId),
          ),
        };
      });
    },
  );

  useSocketHandler<{ id: string; text: string }>(
    SocketEvent.EditMessage,
    (payload) => {
      queryClient.setQueryData<MessagesData>(queryKey, (prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          pages: prev.pages.map((page) =>
            page.map((m) =>
              m.id === payload.id ? { ...m, text: payload.text } : m,
            ),
          ),
        };
      });
    },
  );

  const onLoadMoreSuccess = useCallback(() => {
    // Preserve the user's reading position when older messages are
    // prepended: capture the scroll offset now, then re-apply it
    // after the DOM reflects the prepended content, shifted by
    // however much taller the content got.
    const viewport = viewportRef.current;
    const prevScrollHeight = viewport?.scrollHeight ?? 0;
    const prevScrollTop = viewport?.scrollTop ?? 0;

    requestAnimationFrame(() => {
      if (!viewport) return;
      viewport.scrollTop =
        prevScrollTop + (viewport.scrollHeight - prevScrollHeight);
    });
  }, [viewportRef]);

  const loadMoreMessages = useCallback(() => {
    fetchNextPage().then(onLoadMoreSuccess);
  }, [fetchNextPage, onLoadMoreSuccess]);

  // Reconciles the live window against the server after a reconnect --
  // anything sent, edited, or deleted while disconnected never reached us
  // as a socket event, so the local copy can be wrong until this runs.
  // Re-fetches the same no-cursor/"latest messages" request the initial
  // load made and replaces just page 0 with it, leaving already-loaded
  // older history (pages[1:]) untouched. (react-query v5 dropped
  // `invalidateQueries`'s `refetchPage` filter, so this fetches directly
  // instead of going through the query's own refetch machinery.)
  const reconcileRecentMessages = useCallback(async () => {
    try {
      const latest = await fetchMessagesPage(topicId);
      if (latest.length === 0) return;

      queryClient.setQueryData<MessagesData>(queryKey, (prev) => {
        if (!prev) return prev;
        return { ...prev, pages: [latest, ...prev.pages.slice(1)] };
      });
    } catch (e) {
      // Best-effort background sync -- if it fails, keep showing what we
      // already had rather than surfacing an error for it.
    }
  }, [queryClient, queryKey, topicId]);

  return {
    messages,
    loadMoreMessages,
    loadingMoreMessages: isFetchingNextPage,
    hasMoreMessages: !!hasNextPage,
    reconcileRecentMessages,
  };
}
