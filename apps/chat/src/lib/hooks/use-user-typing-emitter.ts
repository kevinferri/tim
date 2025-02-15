"use client";

import { useEffect } from "react";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { usePrevious } from "./use-previous";

type Args = {
  topicId: string;
  message: string;
};

type TypingPayload = {
  topicId: string;
};

export function useUserTypingEmitter({ topicId, message }: Args) {
  const prev = usePrevious(message);

  const startedTyping = useSocketEmit<TypingPayload>(
    SocketEvent.UserStartedTyping
  );

  const stoppedTyping = useSocketEmit<TypingPayload>(
    SocketEvent.UserStoppedTyping
  );

  useEffect(() => {
    if (prev?.length === 0 && message.length > 0) {
      startedTyping.emit({ topicId });
      return;
    }

    if (prev && prev.length > 0 && message.length === 0) {
      stoppedTyping.emit({ topicId });
      return;
    }
  }, [message.length, prev, startedTyping, stoppedTyping, topicId]);
}
