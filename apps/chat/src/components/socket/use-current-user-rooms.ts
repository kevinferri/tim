"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { Socket } from "socket.io-client";
import { RoomType } from "@tim/socket-types";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";

export { RoomType };

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

// The set of rooms this client *wants* to be in, independent of connection state -- the single source of truth room membership is synced from, both per join/leave and in bulk on every (re)connect.
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

export function useRoomManagement() {
  const emitJoin = useSocketEmit<RoomMembership>(SocketEvent.JoinRoom);
  const emitLeave = useSocketEmit<RoomMembership>(SocketEvent.LeaveRoom);
  const addRoom = useRoomStore((state) => state.addRoom);
  const removeRoom = useRoomStore((state) => state.removeRoom);

  const joinRoom = (id: string, roomType: RoomType) => {
    const room = { id, roomType };

    // Safe to call immediately regardless of connection state -- socket.io buffers emits made before connecting and flushes them once it does.
    addRoom(room);
    emitJoin.emit(room);
  };

  const leaveRoom = (id: string, roomType: RoomType) => {
    const room = { id, roomType };

    removeRoom(room);
    emitLeave.emit(room);
  };

  return { joinRoom, leaveRoom };
}

// Every reconnection is a brand new connection server-side, so previously-joined rooms are gone -- re-announcing the full desired set on every "connect" handles the first connect and every reconnect through one code path.
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
