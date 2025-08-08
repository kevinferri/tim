"use client";

import React, {
  useEffect,
  useRef,
  useLayoutEffect,
  MutableRefObject,
} from "react";
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
  const fetchGuard = useRef(false);
  const intersection = useIntersection(intersectionRef, {
  root: containerRef?.current,
  rootMargin: "150px",
  });

  useEffect(() => {
    if (!fetchGuard.current && !loading && intersection?.isIntersecting) {
      fetchGuard.current = true;
      fetchNextPage();
    }
  }, [loading, intersection, fetchNextPage]);

  useLayoutEffect(() => {
    if (loading) {
      return;
    }

    setTimeout(() => {
      fetchGuard.current = false;
    }, 50);
  }, [loading]);

  return <div ref={intersectionRef}>{children}</div>;
};
