import { useState } from "react";
import { SocketEvent, useSocketHandler } from "../socket/use-socket";
import { Highlight, User } from "@prisma/client";
import { Highlights } from "./message";

type Args = {
  messageId: string;
  existingHighlights: Highlights;
  skip?: boolean;
};

/**
 * This is used when the message is on an "island"
 * meaning it is detatched from the messages in the context and is fetched on it's own via the api
 * If this is the case, it needs to handle it's own highlight state
 */
export function useIslandMessage({
  messageId,
  existingHighlights,
  skip = false,
}: Args) {
  const [highlights, setHighlights] = useState(existingHighlights);

  useSocketHandler<{ highlight: Highlight; createdBy: User }>(
    SocketEvent.AddedHighlight,
    ({ highlight, createdBy }) => {
      if (highlight.messageId !== messageId) return;

      setHighlights([
        ...highlights,
        {
          createdBy: createdBy,
          id: highlight.id,
          userId: highlight.userId,
        },
      ]);
    },
    skip,
    `${SocketEvent.AddedHighlight}:island:${messageId}`
  );

  useSocketHandler<{ messageId: string; userId: string }>(
    SocketEvent.RemovedHighlight,
    (payload) => {
      if (payload.messageId !== messageId) return;

      setHighlights((prevHighlights) =>
        prevHighlights.filter(({ userId }) => userId !== payload.userId)
      );
    },
    skip,
    `${SocketEvent.RemovedHighlight}:island:${messageId}`
  );

  return { highlights };
}
