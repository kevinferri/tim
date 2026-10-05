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

  // Self-managed scroll anchoring (native overflow-anchor is disabled on the
  // viewport): remembers the first visible message so any height change above
  // it -- a load-more prepend, a late-loading image or link preview -- can be
  // cancelled out before paint.
  const anchorRef = useRef<{ el: HTMLElement; top: number } | null>(null);

  const captureAnchor = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const anchors = content.querySelectorAll<HTMLElement>(
      ":scope > [data-scroll-anchor]",
    );
    const scrollTop = viewport.scrollTop;

    // offsetTop is relative to the (positioned) viewport, so this is a
    // layout-only binary search with no getBoundingClientRect per item.
    let lo = 0;
    let hi = anchors.length - 1;
    let found: HTMLElement | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const el = anchors[mid];
      if (el.offsetTop + el.offsetHeight > scrollTop) {
        found = el;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }

    anchorRef.current = found
      ? { el: found, top: found.offsetTop - scrollTop }
      : null;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.addEventListener("scroll", captureAnchor, { passive: true });
    return () => viewport.removeEventListener("scroll", captureAnchor);
  }, [captureAnchor]);

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

      if (!viewport || !heightChanged) return;

      if (wasAtBottom) {
        viewport.scrollTo({ top: nextHeight, behavior: "instant" });
        setIsAtBottom(true);
        captureAnchor();

        requestAnimationFrame(() => {
          const v = viewportRef.current;
          if (!v) return;
          const liveHeight = content.scrollHeight;
          if (v.scrollTop + v.clientHeight < liveHeight) {
            v.scrollTo({ top: liveHeight, behavior: "instant" });
          }
          previousHeight = liveHeight;
          captureAnchor();
        });
        return;
      }

      const anchor = anchorRef.current;
      if (anchor?.el.isConnected) {
        const drift = anchor.el.offsetTop - viewport.scrollTop - anchor.top;
        if (drift !== 0) viewport.scrollTop += drift;
      }
      captureAnchor();
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [setIsAtBottom, captureAnchor]);

  return {
    viewportRef,
    contentRef,
    bottomSentinelRef,
    isAtBottom,
    scrollToBottom,
  };
}
