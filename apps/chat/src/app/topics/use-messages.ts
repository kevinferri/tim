import { useMemo, useState } from "react";
import { Highlight, User } from "@prisma/client";
import { MessageProps } from "./message";
import { HandlerEvent, useSocketHandler } from "@/components/socket/use-socket";

export function useMessages(existingMessages: MessageProps[]) {
  const [messages, setMessages] = useState<MessageProps[]>(existingMessages);

  // Handle new message
  useSocketHandler<MessageProps>(
    HandlerEvent.MessageProcessed,
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

  // Handle add highlight
  useSocketHandler<{ highlight: Highlight; user: User }>(
    HandlerEvent.AddHighlightProcessed,
    ({ highlight }) => {
      setMessages((prevMessages) => {
        return prevMessages.map((message) => {
          if (message.id !== highlight.messageId) {
            return message;
          }

          return {
            ...message,
            highlights: [
              ...message.highlights,
              {
                id: highlight.id,
                messageId: highlight.messageId,
                userId: highlight.userId,
              },
            ],
          };
        });
      });
    }
  );

  // Handle remove highlight
  useSocketHandler<{ messageId: string; userId: string }>(
    HandlerEvent.RemoveHighlightProcessed,
    (payload) => {
      setMessages((prevMessages) => {
        return prevMessages.map((message) => {
          if (message.id !== payload.messageId) {
            return message;
          }

          return {
            ...message,
            highlights: message.highlights.filter(
              ({ userId }) => userId !== payload.userId
            ),
          };
        });
      });
    }
  );

  return useMemo(() => messages, [messages]);
}
