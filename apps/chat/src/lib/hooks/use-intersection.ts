import { RefObject, useEffect, useState } from "react";

export function useIntersection(
  ref: RefObject<HTMLElement | null>,
  options: IntersectionObserverInit
): IntersectionObserverEntry | null {
  const [intersectionObserverEntry, setIntersectionObserverEntry] =
    useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    if (ref.current && typeof IntersectionObserver === "function") {
      const handler = (entries: IntersectionObserverEntry[]) => {
        setIntersectionObserverEntry(entries[0]);
      };

      const observer = new IntersectionObserver(handler, options);
      observer.observe(ref.current);

      return () => {
        setIntersectionObserverEntry(null);
        observer.disconnect();
      };
    }
    return () => {};
    // `ref.current` is deliberately omitted: including it changes the deps array on the render right after mount (null -> element), tearing down the observer and resetting the entry just as the first real reading arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.threshold, options.root, options.rootMargin]);

  return intersectionObserverEntry;
}
