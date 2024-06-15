"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  MutableRefObject,
} from "react";
import keyBy from "lodash.keyby";
import { useRouter } from "next/navigation";
import { MessageProps } from "@/topics/message";
import {
  SocketEvent,
  useSocketEmit,
  useSocketHandler,
} from "@/components/socket/use-socket";
import { Highlight, User } from "@prisma/client";
import { getTopHighlightsAction } from "@/actions/messages";
import { WithRelation } from "../../../types/prisma";
import { useEffectOnce, useWindowFocus } from "@/lib/hooks";

export type CircleMember = WithRelation<"User", "createdCircles">;

type ContextValue = {
  topicId: string;
  circleId: string;
  messages: MessageProps[];
  topHighlights: MessageProps[];
  mediaMessages: MessageProps[];
  circleMembers: CircleMember[];
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  scrollToBottomOfChat: (timeout?: number) => void;
  addShufflingGif: (id: string) => void;
  shufflingGifs: string[];
};

type Props = {
  topicId: string;
  circleId: string;
  existingMessages: MessageProps[];
  existingTopHighlights: MessageProps[];
  existingMediaMessages: MessageProps[];
  existingCircleMemebers: CircleMember[];
  topHighlightsLimit: number;
  messagesLimit: number;
  children: React.ReactNode;
};

const CurrentTopicContext = createContext<ContextValue | undefined>(undefined);

export function CurrentTopicProvider(props: Props) {
  const scrollRef = useRef<null | HTMLDivElement>(null);
  const router = useRouter();
  const userTabFocused = useSocketEmit(SocketEvent.UserTabFocused);
  const userTabBlurred = useSocketEmit(SocketEvent.UserTabBlurred);
  const scrollToBottomOfChat = useCallback((timeout?: number) => {
    setTimeout(() => {
      scrollRef?.current?.scrollIntoView();
    }, timeout ?? 1);
  }, []);

  // next caches server data (messages) by default,
  // this ensures when the user switches
  // topics they get the latest server data
  // gross i know
  useEffectOnce(() => {
    router.refresh();
  });

  const [messages, setMessages] = useState<MessageProps[]>(
    props.existingMessages
  );

  const [topHighlights, setTopHighlights] = useState<MessageProps[]>(
    props.existingTopHighlights
  );

  const [mediaMessages, setMediaMessages] = useState<MessageProps[]>(
    props.existingMediaMessages
  );

  const [circleMembers, setCircleMembers] = useState<CircleMember[]>(
    props.existingCircleMemebers
  );

  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const [shufflingGifs, setShufflingGifs] = useState<string[]>([]);

  const baseTitle = useMemo(
    () => (typeof document !== "undefined" ? document.title : ""),
    []
  );

  const addShufflingGif = useCallback(
    (messageId: string) => {
      setShufflingGifs([...shufflingGifs, messageId]);
    },
    [shufflingGifs]
  );

  const windowFocused = useWindowFocus({
    onFocus: () => {
      userTabFocused.emit({ topicId: props.topicId });
      if (unreadMessageCount !== 0) {
        setUnreadMessageCount(0);
        document.title = baseTitle;
      }
    },
    onBlur: () => {
      userTabBlurred.emit({ topicId: props.topicId });
    },
  });

  // Updates all message state (default messages, top highlights, media)
  const syncedUpdate = useCallback(
    (handler: (prevState: MessageProps[]) => MessageProps[]) => {
      setMessages((prevMessages) => handler(prevMessages));
      setTopHighlights((prevMessages) => handler(prevMessages));
      setMediaMessages((prevMessages) => handler(prevMessages));
    },
    []
  );

  // Handle new message
  useSocketHandler<MessageProps>(
    SocketEvent.SendMessage,
    (newMessage: MessageProps) => {
      setMessages(
        [
          ...messages,
          {
            ...newMessage,
            createdAt: new Date(newMessage.createdAt),
          },
        ].slice(Math.max(messages.length + 1 - props.messagesLimit, 0)) // TODO: revisit me
      );

      if (newMessage.mediaUrl) {
        setMediaMessages([
          {
            ...newMessage,
            createdAt: new Date(newMessage.createdAt),
          },
          ...mediaMessages,
        ]);
      }

      if (!windowFocused) {
        setUnreadMessageCount((count) => {
          const newCount = count + 1;
          document.title = `(${newCount}) ${baseTitle}`;
          return newCount;
        });
      }

      scrollToBottomOfChat();
    }
  );

  // Handle delete message
  useSocketHandler<{ deletedMessageId: string }>(
    SocketEvent.DeleteMessage,
    async (payload) => {
      const wasTopHighlight = !!topHighlights.find(
        ({ id }) => payload.deletedMessageId === id
      );

      syncedUpdate((prevMessages) =>
        prevMessages.filter(({ id }) => id !== payload.deletedMessageId)
      );

      if (wasTopHighlight) {
        const refreshed = await getTopHighlightsAction({
          topicId: props.topicId,
          circleId: props.circleId,
        });

        setTopHighlights(refreshed as MessageProps[]);
      }
    }
  );

  // Handle edit message
  useSocketHandler<{ id: string; text: string }>(
    SocketEvent.EditMessage,
    (payload) => {
      syncedUpdate((prevMessages) =>
        prevMessages.map((m) => {
          if (m.id === payload.id) {
            return {
              ...m,
              text: payload.text,
            };
          }

          return m;
        })
      );
    }
  );

  // Handle added highlight
  useSocketHandler<{ highlight: Highlight; createdBy: User }>(
    SocketEvent.AddedHighlight,
    ({ highlight, createdBy }) => {
      let newTopHighlight = undefined;
      const isAlreadyTopHighlight = topHighlights.find(
        ({ id }) => highlight.messageId == id
      );

      const lowestTopHighlights =
        topHighlights.length > 0
          ? topHighlights[topHighlights.length - 1].highlights.length
          : 0;

      syncedUpdate((prevMessages) => {
        return prevMessages.map((message) => {
          if (message.id !== highlight.messageId) {
            return message;
          }

          const newMessage = {
            ...message,
            highlights: [
              ...message.highlights,
              {
                id: highlight.id,
                messageId: highlight.messageId,
                userId: highlight.userId,
                createdBy,
              },
            ],
          };

          if (
            !isAlreadyTopHighlight &&
            (lowestTopHighlights <= newMessage.highlights.length ||
              topHighlights.length < props.topHighlightsLimit)
          ) {
            newTopHighlight = newMessage;
          }

          return newMessage;
        });
      });

      if (newTopHighlight) {
        setTopHighlights([...topHighlights, newTopHighlight]);
      }
    }
  );

  // Handle removed highlight
  useSocketHandler<{ messageId: string; userId: string }>(
    SocketEvent.RemovedHighlight,
    async (payload) => {
      let toBeRemovedFromTopHighlights: string | undefined = undefined;
      const lowestTopHighlights =
        topHighlights[topHighlights.length - 1].highlights.length;

      syncedUpdate((prevMessages) => {
        return prevMessages.map((message) => {
          if (message.id !== payload.messageId) {
            return message;
          }

          const newMessage = {
            ...message,
            highlights: message.highlights.filter(
              ({ userId }) => userId !== payload.userId
            ),
          };

          if (
            newMessage.highlights.length === 0 ||
            (lowestTopHighlights > newMessage.highlights.length &&
              topHighlights.length >= props.topHighlightsLimit)
          ) {
            toBeRemovedFromTopHighlights = newMessage.id;
          }

          return newMessage;
        });
      });

      if (toBeRemovedFromTopHighlights) {
        const wasTopHighlight = !!topHighlights.find(
          ({ id }) => toBeRemovedFromTopHighlights === id
        );

        if (wasTopHighlight) {
          // Optimistically remove from state
          setTopHighlights((prevHighlights) =>
            prevHighlights.filter(
              ({ id }) => id !== toBeRemovedFromTopHighlights
            )
          );

          // Get top highlight from server to replace the removed one
          const refreshed = await getTopHighlightsAction({
            topicId: props.topicId,
            circleId: props.circleId,
          });

          setTopHighlights(refreshed as MessageProps[]);
        }
      }
    }
  );

  // Handle gif shuffle
  useSocketHandler<{ messageId: string; mediaUrl: string }>(
    SocketEvent.ShuffleGifMessage,
    (payload) => {
      syncedUpdate((prevMessages) =>
        prevMessages.map((m) => {
          if (m.id === payload.messageId) {
            return {
              ...m,
              mediaUrl: payload.mediaUrl,
            };
          }

          return m;
        })
      );

      setShufflingGifs((gifs) => gifs.filter((id) => id !== payload.messageId));
    }
  );

  const contextValue = useMemo(
    () => ({
      messages,
      mediaMessages,
      circleMembers,
      scrollRef,
      scrollToBottomOfChat,
      shufflingGifs,
      addShufflingGif,
      topHighlights: sanitizeTopHighlights(
        topHighlights,
        props.topHighlightsLimit
      ),
      topicId: props.topicId,
      circleId: props.circleId,
    }),
    [
      messages,
      mediaMessages,
      topHighlights,
      circleMembers,
      shufflingGifs,
      addShufflingGif,
      props.topicId,
      props.circleId,
      props.topHighlightsLimit,
      scrollToBottomOfChat,
    ]
  );

  return (
    <CurrentTopicContext.Provider value={contextValue}>
      {props.children}
    </CurrentTopicContext.Provider>
  );
}

export function useCurrentTopicContext() {
  const context = useContext(CurrentTopicContext);

  if (!context) {
    throw new Error(
      "useCurrentTopicContext must be used inside CurrentTopicProvider"
    );
  }

  return context;
}

function sanitizeTopHighlights(messages: MessageProps[], limit: number) {
  return messages
    .sort((a, b) => {
      if (b.highlights.length === a.highlights.length) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else {
        return b.highlights.length - a.highlights.length;
      }
    })
    .slice(0, limit);
}
