import { RefObject, useEffect, useState } from "react";

type Options = {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  skip?: boolean;
};

// Latches to true the first time `ref`'s element enters the viewport and never flips back -- for lazy-mounting something expensive-to-reload once, not for tracking live visibility.
export function useLazyVisible(
  ref: RefObject<Element | null>,
  { root, rootMargin, threshold, skip = false }: Options = {}
): boolean {
  const [isVisible, setIsVisible] = useState(skip);

  useEffect(() => {
    if (skip || isVisible) return;

    const node = ref.current;
    if (!node || typeof IntersectionObserver !== "function") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { root, rootMargin, threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, isVisible, root, rootMargin, threshold]);

  return isVisible;
}
