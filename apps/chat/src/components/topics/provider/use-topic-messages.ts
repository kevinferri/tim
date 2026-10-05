import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  MutableRefObject,
} from "react";
import uniqBy from "lodash.uniqby";
import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { MessageProps, MessageData } from "@/components/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import {
  MessagesData,
  messagesQueryKey,
  updateThreadCache,
  adjustReplyCounts,
  withEditApplied,
  withReferencesCleared,
} from "@/components/topics/provider/topic-query-cache";

type UseTopicMessagesProps = {
  topicId: string;
  existingMessages: MessageData[];
  messagesLimit: number;
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  suppressAutoStickRef: MutableRefObject<boolean>;
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
  suppressAutoStickRef,
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
        replyCount: 0,
      };

      queryClient.setQueryData<MessagesData>(queryKey, (prev) => {
        if (!prev) return prev;

        // De-dup safety net for the append-on-socket-event path, which
        // isn't a queryFn react-query dedupes on its own.
        // Checked across every page, not just the live window: a message
        // already on an older page would otherwise be appended again.
        const alreadyLoaded = prev.pages.some((page) =>
          page.some((m) => m.id === newMsg.id),
        );
        const withNew = alreadyLoaded
          ? prev.pages
          : [[...prev.pages[0], newMsg], ...prev.pages.slice(1)];

        // Gated on alreadyLoaded too: a replayed SendMessage (reconnect racing
        // reconcileRecentMessages) skips the append but would otherwise still
        // bump the thread, double-counting the same reply.
        const pages =
          newMsg.threadRootId && !alreadyLoaded
            ? adjustReplyCounts(withNew, newMsg.threadRootId, 1, newMsg.id)
            : withNew;

        const livePage = pages[0] ?? [];

        // Trims the live window only while the user is at the bottom --
        // trimming while scrolled up reading history would yank content
        // from under them.
        const needsSlice = livePage.length > messagesLimit && isAtBottom;

        if (needsSlice) {
          const slicer = Math.max(livePage.length - messagesLimit, 0);
          // Drops already-loaded older pages too, since they'd be stale
          // relative to the trimmed live window and leave a gap; trimming to
          // exactly messagesLimit also keeps hasNextPage accurate.
          return {
            ...prev,
            pages: [livePage.slice(slicer)],
            pageParams: [prev.pageParams[0]],
          };
        }

        return { ...prev, pages };
      });

      // Keep an open thread panel in sync -- it renders from its own cache.
      if (newMsg.threadRootId) {
        updateThreadCache(queryClient, topicId, (prevThread) => {
          if (prevThread[0]?.id !== newMsg.threadRootId) return prevThread;
          if (prevThread.some((m) => m.id === newMsg.id)) return prevThread;
          return [...prevThread, newMsg];
        });
      }

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

        // Read the thread it belonged to before it's gone, so the remaining
        // members' "N replies" count can come down with it.
        const deletedThreadRootId = prev.pages
          .flat()
          .find(({ id }) => id === payload.deletedMessageId)?.threadRootId;

        const clear = withReferencesCleared(payload.deletedMessageId);
        const pages = prev.pages.map((page) =>
          page.filter(({ id }) => id !== payload.deletedMessageId).map(clear),
        );

        return {
          ...prev,
          pages: deletedThreadRootId
            ? adjustReplyCounts(pages, deletedThreadRootId, -1)
            : pages,
        };
      });

      updateThreadCache(queryClient, topicId, (prev) =>
        prev
          .filter(({ id }) => id !== payload.deletedMessageId)
          .map(withReferencesCleared(payload.deletedMessageId)),
      );
    },
  );

  useSocketHandler<{ id: string; text: string }>(
    SocketEvent.EditMessage,
    (payload) => {
      queryClient.setQueryData<MessagesData>(queryKey, (prev) => {
        if (!prev) return prev;

        const edit = withEditApplied(payload.id, payload.text);

        return { ...prev, pages: prev.pages.map((page) => page.map(edit)) };
      });

      updateThreadCache(queryClient, topicId, (prev) =>
        prev.map(withEditApplied(payload.id, payload.text)),
      );
    },
  );

  const loadMoreMessages = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  // Keyed on the committed `messages` array (not the fetch promise) so
  // back-to-back load-more pages don't race each other's restoration.
  const prevOldestIdRef = useRef<string | undefined>(undefined);
  const prevLengthRef = useRef(0);
  const prevScrollHeightRef = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const oldestId = messages[0]?.id;
    const prevOldestId = prevOldestIdRef.current;
    const prevScrollHeight = prevScrollHeightRef.current;

    // True only for a load-more prepend, not the bottom-trim path above.
    const isPrepend =
      viewport &&
      prevScrollHeight !== undefined &&
      prevOldestId !== undefined &&
      oldestId !== undefined &&
      oldestId !== prevOldestId &&
      messages.length > prevLengthRef.current;

    if (isPrepend) {
      // Consumed by the resize observer on its next notification.
      suppressAutoStickRef.current = true;
      viewport.scrollTop += viewport.scrollHeight - prevScrollHeight;
    }

    prevOldestIdRef.current = oldestId;
    prevLengthRef.current = messages.length;
    prevScrollHeightRef.current = viewport?.scrollHeight;
  }, [messages, viewportRef, suppressAutoStickRef]);

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
