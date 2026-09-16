"use client";

import { useEffect, useRef } from "react";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { usePrevious } from "@/lib/hooks/use-previous";

type Args = {
  topicId: string;
  message: string;
};

type TypingPayload = {
  topicId: string;
};

export function useUserTypingEmitter({ topicId, message }: Args) {
  const prev = usePrevious(message);
  const isTypingRef = useRef(false);

  const startedTyping = useSocketEmit<TypingPayload>(
    SocketEvent.UserStartedTyping,
  );

  const stoppedTyping = useSocketEmit<TypingPayload>(
    SocketEvent.UserStoppedTyping,
  );

  useEffect(() => {
    if (prev?.length === 0 && message.length > 0) {
      isTypingRef.current = true;
      startedTyping.emit({ topicId });
      return;
    }

    if (prev && prev.length > 0 && message.length === 0) {
      isTypingRef.current = false;
      stoppedTyping.emit({ topicId });
      return;
    }
  }, [message.length, prev, startedTyping, stoppedTyping, topicId]);

  // Tells the topic we're leaving that we stopped typing there. Without
  // this, leaving mid-message never fires the transition above, so the
  // server's isTyping flag for us stays stuck true and leaks into whatever
  // topic's active-user list loads next.
  //
  // Depends on stoppedTyping.emit rather than stoppedTyping itself --
  // useSocketEmit returns a fresh object every render, so depending on the
  // object would re-fire this cleanup on every keystroke instead of only
  // when topicId actually changes.
  useEffect(() => {
    return () => {
      if (!isTypingRef.current) return;

      isTypingRef.current = false;
      stoppedTyping.emit({ topicId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, stoppedTyping.emit]);
}
