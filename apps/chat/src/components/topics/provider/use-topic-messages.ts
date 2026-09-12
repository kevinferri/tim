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

  // pages[0] is the newest window and each fetchNextPage() appends an older
  // one, so the array runs newest-first -- flatten in reverse for
  // chronological order.
  const pages = data?.pages;
  const messages = useMemo(
    () => uniqBy([...(pages ?? [])].reverse().flat(), "id"),
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
        // Trims the live window only while the user is at the bottom --
        // trimming while scrolled up reading history would yank content
        // from under them.
        const needsSlice = withNew.length > messagesLimit && isAtBottom;

        if (needsSlice) {
          const slicer = Math.max(withNew.length - messagesLimit, 0);
          // Drops already-loaded older pages too, since they'd be stale
          // relative to the trimmed live window and leave a gap; trimming to
          // exactly messagesLimit also keeps hasNextPage accurate.
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
    // Captures the scroll offset now and re-applies it (shifted by the added
    // height) once the DOM reflects the prepended older messages.
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

  // Re-fetches page 0 directly (react-query v5 dropped invalidateQueries's
  // refetchPage filter) to replace the live window after a reconnect, since
  // missed socket events while disconnected leave it stale.
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
