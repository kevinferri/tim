"use client";

import { usePresenceSync } from "@/components/dashboard/active-circle-members-store";

// Mounted exactly once, inside SocketProvider -- see usePresenceSync for
// why this must not be called from more than one place.
export function PresenceSync() {
  usePresenceSync();
  return null;
}
