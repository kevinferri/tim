import { MutableRefObject, useCallback, useRef } from "react";

type ScrollArgs =
  | {
      timeout?: number;
      force?: boolean;
    }
  | undefined;

export function isNearBottomOfTopic(
  ref: MutableRefObject<HTMLDivElement | null>,
  padding = 120,
) {
  const el = ref.current;
  const threshold = 50;
  if (!el) return false;

  return (
    el.scrollHeight - el.scrollTop <= el.clientHeight + padding + threshold
  );
}

export function useTopicScroll() {
  const scrollRef = useRef<null | HTMLDivElement>(null);
  const newestMessageRef = useRef<null | HTMLDivElement>(null);
  const messagesListRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottomOfChat = useCallback(
    ({ timeout, force }: ScrollArgs = {}) => {
      setTimeout(() => {
        const padding = newestMessageRef.current?.clientHeight;
        if (isNearBottomOfTopic(messagesListRef, padding) || force) {
          scrollRef?.current?.scrollIntoView({ block: "center" });
        }
      }, timeout ?? 1);
    },
    [],
  );

  return {
    scrollRef,
    newestMessageRef,
    messagesListRef,
    scrollToBottomOfChat,
  };
}
