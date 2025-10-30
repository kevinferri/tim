import { useState, useRef, MutableRefObject } from "react";
import { MessageProps, MessageData } from "@/components/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useLazyFetch } from "@/lib/hooks/use-fetch";
import { isNearBottom } from "./utils";

type UseTopicMessagesProps = {
  topicId: string;
  existingMessages: MessageData[];
  messagesLimit: number;
  messagesListRef: MutableRefObject<HTMLDivElement | null>;
  onNewMessage?: (message: MessageProps) => void;
  onMediaMessage?: (message: MessageProps) => void;
};

export function useTopicMessages({
  topicId,
  existingMessages,
  messagesLimit,
  messagesListRef,
  onNewMessage,
  onMediaMessage,
}: UseTopicMessagesProps) {
  const [messages, setMessages] = useState<MessageProps[]>(
    existingMessages as MessageProps[]
  );
  const [hasMoreMessages, setHasMoreMessages] = useState(
    existingMessages.length >= messagesLimit
  );
  const loadMoreAnchorRef = useRef<null | HTMLDivElement>(null);
  const [loadMoreAnchorId, setLoadMoreAnchorId] = useState(
    existingMessages?.[0]?.id
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
        const needsSlice =
          withNew.length > messagesLimit && isNearBottom(messagesListRef);

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
    }
  );

  useSocketHandler<{ deletedMessageId: string }>(
    SocketEvent.DeleteMessage,
    (payload) => {
      setMessages((prev) =>
        prev.filter(({ id }) => id !== payload.deletedMessageId)
      );
    }
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
        })
      );
    }
  );

  const before = messages?.[0]?.createdAt
    ? new Date(messages[0].createdAt)
    : new Date();

  const { fetchData: loadMoreMessages, loading: loadingMoreMessages } =
    useLazyFetch<MessageProps[]>({
      skip: messages.length === 0,
      url: `/api/topics/${topicId}/messages?before=${before.toISOString()}`,
      onSuccess: (newMessages) => {
        if (newMessages.length < messagesLimit) {
          setHasMoreMessages(false);
        }

        setMessages((prev) => [...newMessages, ...prev]);
        setLoadMoreAnchorId(newMessages[newMessages.length - 1]?.id);

        requestAnimationFrame(() => {
          loadMoreAnchorRef?.current?.scrollIntoView({ block: "end" });
        });
      },
    });

  return {
    messages,
    setMessages,
    loadMoreMessages,
    loadingMoreMessages,
    hasMoreMessages,
    loadMoreAnchorRef,
    loadMoreAnchorId,
  };
}
