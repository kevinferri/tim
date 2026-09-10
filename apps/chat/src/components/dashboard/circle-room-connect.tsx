"use client";

import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import {
  RoomType,
  useRoomManagement,
} from "@/components/socket/use-current-user-rooms";

type Props = {
  children: React.ReactNode;
  circleIds: string[];
};

export function CircleRoomConnect({ children, circleIds }: Props) {
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

  return children;
}
