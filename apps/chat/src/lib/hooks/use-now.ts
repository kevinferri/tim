"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 60_000;

// One shared ticker for every relative timestamp on screen, not one per row.
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

// null on the server and during hydration, so SSR and client markup match
// regardless of timezone -- same reason useDateFormatter formats in an effect.
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
}
