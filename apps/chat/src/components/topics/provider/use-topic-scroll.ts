import { useCallback, useRef } from "react";
import { isNearBottom } from "./utils";

type ScrollArgs =
  | {
      timeout?: number;
      force?: boolean;
    }
  | undefined;

export function useTopicScroll() {
  const scrollRef = useRef<null | HTMLDivElement>(null);
  const newestMessageRef = useRef<null | HTMLDivElement>(null);
  const messagesListRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottomOfChat = useCallback(
    ({ timeout, force }: ScrollArgs = {}) => {
      setTimeout(() => {
        const padding = newestMessageRef.current?.clientHeight;
        if (isNearBottom(messagesListRef, padding) || force) {
          scrollRef?.current?.scrollIntoView({ block: "center" });
        }
      }, timeout ?? 1);
    },
    []
  );

  return {
    scrollRef,
    newestMessageRef,
    messagesListRef,
    scrollToBottomOfChat,
  };
}
