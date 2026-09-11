"use client";

import { usePresenceSync } from "@/components/dashboard/active-circle-members-store";
import { useUserStatusSync } from "@/components/dashboard/user-status-store";

// Mounted exactly once, inside SocketProvider -- see usePresenceSync and
// useUserStatusSync for why each must not be called from more than one
// place.
export function PresenceSync() {
  usePresenceSync();
  useUserStatusSync();
  return null;
}
