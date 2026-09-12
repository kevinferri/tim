"use client";

import { useUserStatsHighlightSync } from "@/components/dashboard/use-user-stats-highlight-sync";

// Mount exactly once inside SocketProvider -- duplicate mounts would double-patch the cache on every highlight event.
export function UserStatsHighlightSync() {
  useUserStatsHighlightSync();
  return null;
}
