import { useCallback, useState, MutableRefObject } from "react";
import uniqBy from "lodash.uniqby";
import { MessageProps, MessageData } from "@/components/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useLazyFetch } from "@/lib/hooks/use-fetch";

type UseTopicMessagesProps = {
  topicId: string;
  existingMessages: MessageData[];
  messagesLimit: number;
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  onNewMessage?: (message: MessageProps) => void;
  onMediaMessage?: (message: MessageProps) => void;
};

export function useTopicMessages({
  topicId,
  existingMessages,
  messagesLimit,
  viewportRef,
  isAtBottom,
  onNewMessage,
  onMediaMessage,
}: UseTopicMessagesProps) {
  const [messages, setMessages] = useState<MessageProps[]>(
    existingMessages as MessageProps[],
  );
  const [hasMoreMessages, setHasMoreMessages] = useState(
    existingMessages.length >= messagesLimit,
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

      setMessages((prev) => {
        const withNew = [...prev, newMsg];
        // Only trim old messages out of state while the user is at the
        // bottom -- trimming while they're scrolled up reading history
        // would yank content out from under them.
        const needsSlice = withNew.length > messagesLimit && isAtBottom;

        if (needsSlice) {
          setHasMoreMessages(true);
          const slicer = Math.max(prev.length + 1 - messagesLimit, 0);
          return withNew.slice(slicer);
        }
        return withNew;
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
      setMessages((prev) =>
        prev.filter(({ id }) => id !== payload.deletedMessageId),
      );
    },
  );

  useSocketHandler<{ id: string; text: string }>(
    SocketEvent.EditMessage,
    (payload) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === payload.id) {
            return { ...m, text: payload.text };
          }
          return m;
        }),
      );
    },
  );

  const before = messages?.[0]?.createdAt
    ? new Date(messages[0].createdAt)
    : new Date();

  const onLoadMoreSuccess = useCallback(
    (newMessages: MessageProps[]) => {
      if (newMessages.length < messagesLimit) {
        setHasMoreMessages(false);
      }

      // Preserve the user's reading position when older messages are
      // prepended: capture the scroll offset now, then re-apply it
      // after the DOM reflects the prepended content, shifted by
      // however much taller the content got.
      const viewport = viewportRef.current;
      const prevScrollHeight = viewport?.scrollHeight ?? 0;
      const prevScrollTop = viewport?.scrollTop ?? 0;

      setMessages((prev) =>
        // Defensive against duplicates -- an overlapping "load more" call
        // (or a retry) would otherwise render the same message twice.
        uniqBy([...newMessages, ...prev], "id"),
      );

      requestAnimationFrame(() => {
        if (!viewport) return;
        viewport.scrollTop =
          prevScrollTop + (viewport.scrollHeight - prevScrollHeight);
      });
    },
    [messagesLimit, viewportRef],
  );

  const { fetchData: loadMoreMessages, loading: loadingMoreMessages } =
    useLazyFetch<MessageProps[]>({
      skip: messages.length === 0,
      url: `/api/topics/${topicId}/messages?before=${before.toISOString()}`,
      onSuccess: onLoadMoreSuccess,
    });

  // Reconciles the most recent window of messages against the server
  // after a reconnect -- anything sent, edited, or deleted while
  // disconnected never reached us as a socket event, so the local copy
  // can be wrong until this runs. Reuses the same "latest messages"
  // request the initial page load makes (no `before` cursor), then
  // replaces just the overlapping window: history older than that
  // window is left untouched, since it's outside what could have
  // drifted.
  const reconcileRecentMessages = useCallback(async () => {
    try {
      const resp = await fetch(`/api/topics/${topicId}/messages`);
      if (!resp.ok) return;

      const latest = (await resp.json()) as MessageProps[];
      if (latest.length === 0) return;

      const oldestFreshTime = new Date(latest[0].createdAt ?? 0).getTime();

      setMessages((prev) => {
        const olderHistory = prev.filter(
          (m) => new Date(m.createdAt ?? 0).getTime() < oldestFreshTime,
        );
        return [...olderHistory, ...latest];
      });
    } catch (e) {
      // Best-effort background sync -- if it fails, keep showing what we
      // already had rather than surfacing an error for it.
    }
  }, [topicId]);

  return {
    messages,
    setMessages,
    loadMoreMessages,
    loadingMoreMessages,
    hasMoreMessages,
    reconcileRecentMessages,
  };
}
