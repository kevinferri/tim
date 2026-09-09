import { RefObject, useEffect, useState } from "react";

export function useIntersection(
  ref: RefObject<HTMLElement>,
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
    // `ref` is a stable RefObject and is already attached by the time this
    // effect runs, so it's read (not depended on) inside the effect body --
    // including `ref.current` here caused the deps array to change on the
    // render right after mount (null -> element), tearing the observer down
    // and resetting the entry to null just as the first real reading arrived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.threshold, options.root, options.rootMargin]);

  return intersectionObserverEntry;
}
