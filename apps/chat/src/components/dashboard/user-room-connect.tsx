"use client";

import { useSelf } from "@/components/auth/self-provider";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import {
  RoomType,
  useRoomManagement,
} from "@/components/socket/use-current-user-rooms";

// Mount exactly once inside SocketProvider -- joins/leaves are keyed by self.id, so a duplicate mount would double-join the same room.
export function UserRoomConnect() {
  const self = useSelf();
  const { joinRoom, leaveRoom } = useRoomManagement();

  useEffectOnce(() => {
    joinRoom(self.id, RoomType.User);

    return () => {
      leaveRoom(self.id, RoomType.User);
    };
  });

  return null;
}
