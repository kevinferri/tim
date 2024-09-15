"use client";

import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { useEffectOnce } from "@/lib/hooks";

type Props = {
  children: React.ReactNode;
  circleIds: string[];
};

export function CircleRoomConnect({ children, circleIds }: Props) {
  const joinRoom = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoom = useSocketEmit(SocketEvent.LeaveRoom);

  useEffectOnce(() => {
    process.nextTick(() => {
      circleIds.forEach((id) => {
        joinRoom.emit({ id, roomType: "circle" });
      });
    });

    return () => {
      circleIds.forEach((id) => {
        leaveRoom.emit({ id, roomType: "circle" });
      });
    };
  });

  return children;
}
