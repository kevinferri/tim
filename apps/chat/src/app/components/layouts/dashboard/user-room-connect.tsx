"use client";

import { useEffect } from "react";
import { useSelf } from "@/components/auth/self-provider";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";

type Props = {
  children: React.ReactNode;
};

export function UserRoomConnect({ children }: Props) {
  const self = useSelf();
  const joinRoom = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoom = useSocketEmit(SocketEvent.LeaveRoom);

  useEffect(() => {
    joinRoom.emit({ id: self.id, roomType: "user" });

    return () => {
      leaveRoom.emit({ userId: self.id });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}
