import { useSyncExternalStore } from "react";

const QUERY = "(hover: hover)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// False on touch-first devices, where hover-only UI is unreachable. Assumes a mouse during SSR.
export function useCanHover() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
