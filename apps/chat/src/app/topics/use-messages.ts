import { useMemo, useState } from "react";
import { Highlight, User } from "@prisma/client";
import { MessageProps } from "./message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";

export function useMessages(existingMessages: MessageProps[]) {
  const [messages, setMessages] = useState<MessageProps[]>(existingMessages);

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
    (payload) => {
      console.log(payload);
      setMessages((prevMessages) => {
        return prevMessages.filter(({ id }) => id !== payload.deletedMessageId);
      });
    }
  );

  // Handle add highlight
  useSocketHandler<{ highlight: Highlight; createdBy: User }>(
    SocketEvent.AddedHighlight,
    ({ highlight, createdBy }) => {
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
                createdBy,
              },
            ],
          };
        });
      });
    }
  );

  // Handle remove highlight
  useSocketHandler<{ messageId: string; userId: string }>(
    SocketEvent.RemovedHighlight,
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
