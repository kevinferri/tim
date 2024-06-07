"use client";

import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { useEffectOnce } from "@/lib/hooks";

type Props = {
  children: React.ReactNode;
  circleId: string;
};

export function CircleRoomConnect({ children, circleId }: Props) {
  const joinRoom = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoom = useSocketEmit(SocketEvent.LeaveRoom);

  useEffectOnce(() => {
    const payload = { id: circleId, roomType: "circle" };
    joinRoom.emit(payload);

    return () => {
      leaveRoom.emit(payload);
    };
  });

  return children;
}
