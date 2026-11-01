"use client";

import { usePresenceSync } from "@/components/dashboard/active-circle-members-store";
import { useUserStatusSync } from "@/components/dashboard/user-status-store";
import { useProfileSync } from "@/components/dashboard/profile-sync";

// Mount exactly once inside SocketProvider -- usePresenceSync/useUserStatusSync/useProfileSync each assume a single subscriber for their socket listeners.
export function PresenceSync() {
  usePresenceSync();
  useUserStatusSync();
  useProfileSync();
  return null;
}
