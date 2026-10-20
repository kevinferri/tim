"use client";

import React, { useEffect, useRef, MutableRefObject } from "react";
import { useIntersection } from "@/lib/hooks/use-intersection";

const ROOT_MARGIN_PX = 150;

type Props = {
  children?: React.ReactNode;
  fetchNextPage: () => void;
  loading: boolean;
  containerRef?: MutableRefObject<HTMLDivElement | null>;
};

export const InfiniteLoader = ({
  fetchNextPage,
  loading,
  containerRef,
  children,
}: Props) => {
  const intersectionRef = useRef<HTMLDivElement>(null);
  const intersection = useIntersection(intersectionRef, {
    root: containerRef?.current,
    rootMargin: `${ROOT_MARGIN_PX}px`,
  });

  useEffect(() => {
    if (loading || !intersection?.isIntersecting) return;

    // The observer reports async, so right after a prepend the entry is stale -- re-measure before chaining another fetch.
    const el = intersectionRef.current;
    const root = containerRef?.current;
    if (
      el &&
      root &&
      el.getBoundingClientRect().bottom <
        root.getBoundingClientRect().top - ROOT_MARGIN_PX
    ) {
      return;
    }

    fetchNextPage();
  }, [loading, intersection, fetchNextPage, containerRef]);

  return <div ref={intersectionRef}>{children}</div>;
};
