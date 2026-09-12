"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Slack before auto-scroll considers itself off the bottom -- same cushion most chat apps use.
const BOTTOM_SLACK_PX = 150;

type ScrollToBottomOptions = {
  behavior?: ScrollBehavior;
};

export function useTopicScroll() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  const [isAtBottom, setIsAtBottomState] = useState(true);
  const isAtBottomRef = useRef(true);

  const setIsAtBottom = useCallback((value: boolean) => {
    isAtBottomRef.current = value;
    setIsAtBottomState(value);
  }, []);

  const scrollToBottom = useCallback(
    ({ behavior = "smooth" }: ScrollToBottomOptions = {}) => {
      // Mark ourselves pinned immediately so a resize tick that lands
      // mid-scroll doesn't get missed.
      setIsAtBottom(true);

      // Deferred to a frame because scrollHeight would otherwise reflect the
      // DOM before React commits the content we're scrolling to (e.g. a
      // just-sent message).
      requestAnimationFrame(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      });
    },
    [setIsAtBottom],
  );

  // Sentinel-based instead of scrollTop/scrollHeight math, to avoid estimating with magic padding numbers.
  useEffect(() => {
    const viewport = viewportRef.current;
    const sentinel = bottomSentinelRef.current;
    if (!viewport || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsAtBottom(entry.isIntersecting),
      { root: viewport, rootMargin: `0px 0px ${BOTTOM_SLACK_PX}px 0px` },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [setIsAtBottom]);

  // Checks scroll position against the pre-change height directly (not the
  // async isAtBottomRef) so a fast resize can't race the IntersectionObserver,
  // and also reacts to net shrinks (e.g. window trimming) that a "grew" check
  // alone would miss.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    let previousHeight = content.scrollHeight;

    const observer = new ResizeObserver(() => {
      const nextHeight = content.scrollHeight;
      const heightChanged = nextHeight !== previousHeight;
      const viewport = viewportRef.current;
      const wasAtBottom = viewport
        ? viewport.scrollTop + viewport.clientHeight >=
          previousHeight - BOTTOM_SLACK_PX
        : isAtBottomRef.current;

      previousHeight = nextHeight;

      if (heightChanged && wasAtBottom) {
        viewport?.scrollTo({ top: nextHeight, behavior: "instant" });
        setIsAtBottom(true);

        requestAnimationFrame(() => {
          const v = viewportRef.current;
          if (!v) return;
          const liveHeight = content.scrollHeight;
          if (v.scrollTop + v.clientHeight < liveHeight) {
            v.scrollTo({ top: liveHeight, behavior: "instant" });
          }
          previousHeight = liveHeight;
        });
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [setIsAtBottom]);

  return {
    viewportRef,
    contentRef,
    bottomSentinelRef,
    isAtBottom,
    scrollToBottom,
  };
}
