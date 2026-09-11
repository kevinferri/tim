"use client";

import { useUserStatsHighlightSync } from "@/components/dashboard/use-user-stats-highlight-sync";

// Mounted exactly once, inside SocketProvider -- see
// use-user-stats-highlight-sync.ts for why this must not be called from
// more than one place.
export function UserStatsHighlightSync() {
  useUserStatsHighlightSync();
  return null;
}
