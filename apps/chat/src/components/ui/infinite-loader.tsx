"use client";

import React, { useEffect, useRef, useState, MutableRefObject } from "react";
import { useIntersection } from "@/lib/hooks/use-intersection";

type Props = {
  children?: React.ReactNode;
  fetchNextPage: () => void;
  loading: boolean;
  containerRef?: MutableRefObject<HTMLDivElement | null>;
  rootMargin?: string;
};

export const InfiniteLoader = ({
  fetchNextPage,
  loading,
  containerRef,
  rootMargin = "150px",
  children,
}: Props) => {
  const intersectionRef = useRef(null);
  // Read after mount: containerRef is still null during this component's first
  // render, and a null root silently measures against the window instead,
  // where rootMargin can't reach inside the scroll container.
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    setRoot(containerRef?.current ?? null);
  }, [containerRef]);

  const intersection = useIntersection(intersectionRef, {
    root,
    rootMargin,
  });

  useEffect(() => {
    if (!loading && intersection?.isIntersecting) {
      fetchNextPage();
    }
  }, [loading, intersection, fetchNextPage]);

  return <div ref={intersectionRef}>{children}</div>;
};
