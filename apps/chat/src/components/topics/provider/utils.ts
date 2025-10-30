import { MutableRefObject } from "react";
import { MessageProps, MessageData } from "@/components/topics/message";

export function isNearBottom(
  ref: MutableRefObject<HTMLDivElement | null>,
  padding = 120
) {
  const el = ref.current;
  const threshold = 50;
  if (!el) return false;

  return (
    el.scrollHeight - el.scrollTop <= el.clientHeight + padding + threshold
  );
}

export function sanitizeTopHighlights(messages: MessageProps[], limit: number) {
  return [...messages]
    .sort((a, b) => {
      const bLen = b.highlights?.length ?? 0;
      const aLen = a.highlights?.length ?? 0;
      if (bLen === aLen) {
        return (
          new Date(b.createdAt ?? new Date()).getTime() -
          new Date(a.createdAt ?? new Date()).getTime()
        );
      }
      return bLen - aLen;
    })
    .slice(0, limit);
}
