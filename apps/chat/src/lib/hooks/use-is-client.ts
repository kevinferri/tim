import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False during SSR and hydration, true after: for client-only state (e.g. a warm query cache) that the server can't render.
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
