"use client";

import { create } from "zustand";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";

type RoomType = "user" | "circle" | "topic";

type RoomMembership = {
  id: string;
  roomType: RoomType;
};

type Store = {
  joinedRooms: RoomMembership[];
  joinRoom: (room: RoomMembership) => void;
  leaveRoom: (room: RoomMembership) => void;
  clearRooms: () => void;
  getJoinedRooms: () => RoomMembership[];
};

const useStore = create<Store>((set, get) => ({
  joinedRooms: [],

  joinRoom: (room) =>
    set((state) => {
      const exists = state.joinedRooms.some(
        (r) => r.id === room.id && r.roomType === room.roomType
      );
      if (exists) return state;

      return {
        joinedRooms: [...state.joinedRooms, room],
      };
    }),

  leaveRoom: (room) =>
    set((state) => ({
      joinedRooms: state.joinedRooms.filter(
        (r) => r.id !== room.id || r.roomType !== room.roomType
      ),
    })),

  clearRooms: () => set(() => ({ joinedRooms: [] })),

  getJoinedRooms: () => get().joinedRooms,
}));

export function useCurrentUserRooms() {
  const joinedRooms = useStore((state) => state.joinedRooms);
  const joinRoom = useStore((state) => state.joinRoom);
  const leaveRoom = useStore((state) => state.leaveRoom);
  const clearRooms = useStore((state) => state.clearRooms);
  const getJoinedRooms = useStore((state) => state.getJoinedRooms);

  return {
    joinedRooms,
    joinRoom,
    leaveRoom,
    clearRooms,
    getJoinedRooms,
  };
}

export function useRoomManagement() {
  const joinRoomSocket = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoomSocket = useSocketEmit(SocketEvent.LeaveRoom);
  const { joinRoom: joinRoomStore, leaveRoom: leaveRoomStore } =
    useCurrentUserRooms();

  const joinRoom = (id: string, roomType: RoomType) => {
    const payload = { id, roomType };
    joinRoomSocket.emit(payload);
    joinRoomStore(payload);
  };

  const leaveRoom = (id: string, roomType: RoomType) => {
    const payload = { id, roomType };
    leaveRoomSocket.emit(payload);
    leaveRoomStore(payload);
  };

  return { joinRoom, leaveRoom };
}
