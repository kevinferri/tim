"use client";

import { create } from "zustand";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";

export type UserStatusEntry = {
  status: string | null;
  lastStatusUpdate: Date | null;
};

export type UserUpdatedStatusPayload = {
  user: {
    id: string;
    name: string;
    status: string | null;
    lastStatusUpdate: Date | null;
  };
};

type Store = {
  byUserId: Record<string, UserStatusEntry>;
  setStatus: (userId: string, entry: UserStatusEntry) => void;
};

const useStore = create<Store>((set) => ({
  byUserId: {},

  setStatus: (userId, entry) =>
    set((state) => ({
      byUserId: { ...state.byUserId, [userId]: entry },
    })),
}));

// Mount exactly once near the socket root -- subscribing per-avatar would create as many redundant listeners as visible avatars, each with its own stale-on-remount status.
export function useUserStatusSync() {
  const setStatus = useStore((state) => state.setStatus);

  useSocketHandler<UserUpdatedStatusPayload>(
    SocketEvent.UserUpdatedStatus,
    (payload) => setStatus(payload.user.id, payload.user),
  );
}

// The `entry ?? initial` merge happens outside the selector because callers pass a fresh `initial` object every render -- folding it into the selector's return value would break Zustand's reference equality check and force endless re-renders.
export function useUserStatus(userId: string, initial: UserStatusEntry) {
  const entry = useStore((state) => state.byUserId[userId]);
  return entry ?? initial;
}
