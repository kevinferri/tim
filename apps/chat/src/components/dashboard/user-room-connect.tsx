"use client";

import { useSelf } from "@/components/auth/self-provider";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { useEffectOnce } from "@/lib/hooks";

type Props = {
  children: React.ReactNode;
};

export function UserRoomConnect({ children }: Props) {
  const self = useSelf();
  const joinRoom = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoom = useSocketEmit(SocketEvent.LeaveRoom);

  useEffectOnce(() => {
    const payload = { id: self.id, roomType: "user" };
    joinRoom.emit(payload);

    return () => {
      leaveRoom.emit(payload);
    };
  });

  return children;
}
