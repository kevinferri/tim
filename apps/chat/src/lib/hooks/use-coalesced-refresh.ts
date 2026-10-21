"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

const COALESCE_MS = 250;

// Shared across callers: a burst of socket events collapses into one refresh instead of each aborting the previous in-flight RSC stream.
let pendingRouter: Router | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function flush() {
  timer = undefined;

  // Background tabs get throttled/frozen mid-fetch, so hold the refresh until the tab is visible again.
  if (document.hidden) {
    document.addEventListener("visibilitychange", onVisible);
    return;
  }

  pendingRouter?.refresh();
  pendingRouter = null;
}

function onVisible() {
  if (document.hidden) return;
  document.removeEventListener("visibilitychange", onVisible);
  flush();
}

export function useCoalescedRefresh() {
  const router = useRouter();

  return useCallback(() => {
    pendingRouter = router;
    timer ??= setTimeout(flush, COALESCE_MS);
  }, [router]);
}
