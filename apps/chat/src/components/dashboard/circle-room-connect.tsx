"use client";

import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { useRoomManagement } from "@/components/socket/use-current-user-rooms";

type Props = {
  children: React.ReactNode;
  circleIds: string[];
};

export function CircleRoomConnect({ children, circleIds }: Props) {
  const { joinRoom, leaveRoom } = useRoomManagement();

  useEffectOnce(() => {
    process.nextTick(() => {
      circleIds.forEach((id) => {
        joinRoom(id, "circle");
      });
    });

    return () => {
      circleIds.forEach((id) => {
        leaveRoom(id, "circle");
      });
    };
  });

  return children;
}
