"use client";

import { usePresenceSync } from "@/components/dashboard/active-circle-members-store";
import { useUserStatusSync } from "@/components/dashboard/user-status-store";

// Mount exactly once inside SocketProvider -- usePresenceSync/useUserStatusSync each assume a single subscriber for their socket listeners.
export function PresenceSync() {
  usePresenceSync();
  useUserStatusSync();
  return null;
}
