"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";
import { MessageProps } from "@/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { Highlight, User } from "@prisma/client";
import { getTopHighlightsAction } from "@/actions/messages";

type ContextValue = {
  topicId: string;
  circleId: string;
  messages: MessageProps[];
  topHighlights: MessageProps[];
};

type Props = {
  topicId: string;
  circleId: string;
  existingMessages: MessageProps[];
  existingTopHighlights: MessageProps[];
  topHighlightsLimit: number;
  messagesLimit: number;
  children: React.ReactNode;
};

const CurrentTopicContext = createContext<ContextValue | undefined>(undefined);

export function CurrentTopicProvider(props: Props) {
  const [messages, setMessages] = useState<MessageProps[]>(
    props.existingMessages
  );

  const [topHighlights, setTopHighlights] = useState<MessageProps[]>(
    props.existingTopHighlights
  );

  const syncedUpdate = useCallback(
    (handler: (prevState: MessageProps[]) => MessageProps[]) => {
      setMessages((prevMessages) => handler(prevMessages));
      setTopHighlights((prevMessages) => handler(prevMessages));
    },
    []
  );

  // Handle new message
  useSocketHandler<MessageProps>(
    SocketEvent.SendMessage,
    (newMessage: MessageProps) => {
      setMessages([
        ...messages,
        {
          ...newMessage,
          createdAt: new Date(newMessage.createdAt),
        },
      ]);
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
        const refreshed = await getTopHighlightsAction(props.topicId);
        setTopHighlights(refreshed as MessageProps[]);
      }
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
        topHighlights[topHighlights.length - 1].highlights.length;

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
        const newTopHighlights =
          topHighlights.length === props.topHighlightsLimit
            ? [...topHighlights.slice(0, -1), newTopHighlight]
            : [...topHighlights, newTopHighlight];

        setTopHighlights(newTopHighlights);
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
        // Optimistically remove from state
        setTopHighlights((prevHighlights) =>
          prevHighlights.filter(({ id }) => id !== toBeRemovedFromTopHighlights)
        );

        // Get top highlight from server to replace the removed one
        const refreshed = await getTopHighlightsAction(props.topicId);
        setTopHighlights(refreshed as MessageProps[]);
      }
    }
  );

  const contextValue = useMemo(
    () => ({
      messages,
      topHighlights,
      topicId: props.topicId,
      circleId: props.circleId,
    }),
    [messages, topHighlights, props.topicId, props.circleId]
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
