"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { Socket } from "socket.io-client";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";

type RoomType = "user" | "circle" | "topic";

export type RoomMembership = {
  id: string;
  roomType: RoomType;
};

function isSameRoom(a: RoomMembership, b: RoomMembership) {
  return a.id === b.id && a.roomType === b.roomType;
}

type Store = {
  joinedRooms: RoomMembership[];
  addRoom: (room: RoomMembership) => void;
  removeRoom: (room: RoomMembership) => void;
};

// The set of rooms this client *wants* to be in, independent of the
// current connection state. This is the single source of truth room
// membership is synced from -- both right after a join/leave call and
// in bulk every time the socket (re)connects.
const useRoomStore = create<Store>((set) => ({
  joinedRooms: [],

  addRoom: (room) =>
    set((state) => {
      if (state.joinedRooms.some((r) => isSameRoom(r, room))) return state;
      return { joinedRooms: [...state.joinedRooms, room] };
    }),

  removeRoom: (room) =>
    set((state) => ({
      joinedRooms: state.joinedRooms.filter((r) => !isSameRoom(r, room)),
    })),
}));

// How long a leave sits pending before it's actually sent. Covers e.g.
// switching topics, where the old TopicChat unmounts (leave) and a new one
// mounts for the new topic (join) as two independent lifecycle events --
// without a delay, the parent circle's active-user count can flicker down
// and back up in the gap between them. Rejoining the same room within this
// window cancels the pending leave outright, so the round trip through the
// server never happens at all.
//
const ROOM_LEAVE_DEBOUNCE_MS = 300;

// Keyed by room ("<roomType>::<id>") so a rejoin can find and cancel the
// matching pending leave.
const pendingLeaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function roomKey(room: RoomMembership) {
  return `${room.roomType}::${room.id}`;
}

export function useRoomManagement() {
  const emitJoin = useSocketEmit<RoomMembership>(SocketEvent.JoinRoom);
  const emitLeave = useSocketEmit<RoomMembership>(SocketEvent.LeaveRoom);
  const addRoom = useRoomStore((state) => state.addRoom);
  const removeRoom = useRoomStore((state) => state.removeRoom);

  const joinRoom = (id: string, roomType: RoomType) => {
    const room = { id, roomType };
    const key = roomKey(room);

    // We were never actually removed from this room server-side -- the
    // leave was still pending -- so cancel it and skip re-announcing a
    // join we never left.
    const pendingLeave = pendingLeaveTimers.get(key);
    if (pendingLeave) {
      clearTimeout(pendingLeave);
      pendingLeaveTimers.delete(key);
      return;
    }

    // Record the desired room first, then announce it. socket.io buffers
    // emits made before the connection is up and flushes them once it
    // connects, so this is safe to call immediately on mount regardless
    // of connection state -- no need to defer or wait for a "connected"
    // signal.
    addRoom(room);
    emitJoin.emit(room);
  };

  const leaveRoom = (id: string, roomType: RoomType) => {
    const room = { id, roomType };
    const key = roomKey(room);

    const existingTimer = pendingLeaveTimers.get(key);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      pendingLeaveTimers.delete(key);
      removeRoom(room);
      emitLeave.emit(room);
    }, ROOM_LEAVE_DEBOUNCE_MS);

    pendingLeaveTimers.set(key, timer);
  };

  return { joinRoom, leaveRoom };
}

// Mount once, at the socket's root (SocketProvider). Every reconnection
// establishes a brand new connection from the server's perspective, so
// any rooms it had joined before are gone -- this re-announces the full
// desired set on every "connect", which covers the very first connect
// and every reconnect through the same single code path instead of
// treating them as two different cases.
export function useRoomResyncOnConnect(socket: Socket) {
  useEffect(() => {
    function onConnect() {
      const rooms = useRoomStore.getState().joinedRooms;
      rooms.forEach((room) => socket.emit(SocketEvent.JoinRoom, room));
    }

    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket]);
}
