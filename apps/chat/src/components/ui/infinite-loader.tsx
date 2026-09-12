"use client";

import React, { useEffect, useRef, MutableRefObject } from "react";
import { useIntersection } from "@/lib/hooks/use-intersection";

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
  const intersectionRef = useRef(null);
  const intersection = useIntersection(intersectionRef, {
    root: containerRef?.current,
    rootMargin: "150px",
  });

  useEffect(() => {
    if (!loading && intersection?.isIntersecting) {
      fetchNextPage();
    }
  }, [loading, intersection, fetchNextPage]);

  return <div ref={intersectionRef}>{children}</div>;
};
