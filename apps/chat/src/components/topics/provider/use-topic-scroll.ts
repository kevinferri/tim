"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// How close to the bottom (in px) still counts as "at the bottom" for
// auto-scroll purposes -- the same slack most chat apps give you before
// they stop pinning you to new messages.
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

      // Callers often trigger this in the same tick as a state update
      // that's about to add the very content we're scrolling to (e.g.
      // the message that was just sent). React hasn't committed that
      // yet, so scrollHeight here would still be the *previous* bottom.
      // Deferring to a frame guarantees the DOM (and therefore
      // scrollHeight) reflects the update first.
      requestAnimationFrame(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      });
    },
    [setIsAtBottom],
  );

  // Tracks whether the bottom of the list is currently in view. Replaces
  // the old scrollTop/scrollHeight math with a sentinel element -- no
  // magic padding numbers to estimate.
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

  // Keeps the list pinned to the bottom as its content grows for any
  // reason -- a new message, an image or embed finishing load, an edit
  // box expanding, etc. This single mechanism replaces every ad-hoc
  // "scroll after this thing loads" callback the old implementation
  // needed scattered through message/media/link-preview components.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    let previousHeight = content.scrollHeight;

    const observer = new ResizeObserver(() => {
      const nextHeight = content.scrollHeight;
      const grew = nextHeight > previousHeight;
      previousHeight = nextHeight;

      if (grew && isAtBottomRef.current) {
        viewportRef.current?.scrollTo({ top: nextHeight, behavior: "instant" });
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return {
    viewportRef,
    contentRef,
    bottomSentinelRef,
    isAtBottom,
    scrollToBottom,
  };
}
