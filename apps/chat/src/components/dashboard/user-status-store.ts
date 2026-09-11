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

// Registers the status socket listener exactly once. Mount this a single
// time, near the socket root (see PresenceSync) -- otherwise every
// UserAvatar/UserDropDown instance subscribing itself means as many
// redundant listeners as there are visible avatars, each holding its own
// stale-on-remount copy of the status it happened to render with. See
// active-circle-members-store's usePresenceSync for the same fix applied
// to presence.
export function useUserStatusSync() {
  const setStatus = useStore((state) => state.setStatus);

  useSocketHandler<UserUpdatedStatusPayload>(
    SocketEvent.UserUpdatedStatus,
    (payload) => setStatus(payload.user.id, payload.user),
  );
}

// `initial` is the status a server component rendered this user with --
// used until a live update for this id arrives over the socket, at which
// point the store takes over as the source of truth.
//
// The fallback merge happens here, outside the store selector: callers
// pass a fresh `initial` object every render, so folding it into the
// selector's return value would hand Zustand a new reference on every
// call and defeat its equality check, forcing endless re-renders. Selecting
// the raw (possibly undefined) entry keeps that return value stable across
// renders where nothing in the store changed.
export function useUserStatus(userId: string, initial: UserStatusEntry) {
  const entry = useStore((state) => state.byUserId[userId]);
  return entry ?? initial;
}
