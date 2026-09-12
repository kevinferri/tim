"use client";

import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import {
  RoomType,
  useRoomManagement,
} from "@/components/socket/use-current-user-rooms";

type Props = {
  circleIds: string[];
};

// Mount exactly once inside SocketProvider -- a duplicate mount would double-join the same circle rooms.
export function CircleRoomConnect({ circleIds }: Props) {
  const { joinRoom, leaveRoom } = useRoomManagement();

  useEffectOnce(() => {
    circleIds.forEach((id) => {
      joinRoom(id, RoomType.Circle);
    });

    return () => {
      circleIds.forEach((id) => {
        leaveRoom(id, RoomType.Circle);
      });
    };
  });

  return null;
}
