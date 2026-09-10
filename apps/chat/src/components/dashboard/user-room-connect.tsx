"use client";

import { useSelf } from "@/components/auth/self-provider";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import {
  RoomType,
  useRoomManagement,
} from "@/components/socket/use-current-user-rooms";

type Props = {
  children: React.ReactNode;
};

export function UserRoomConnect({ children }: Props) {
  const self = useSelf();
  const { joinRoom, leaveRoom } = useRoomManagement();

  useEffectOnce(() => {
    joinRoom(self.id, RoomType.User);

    return () => {
      leaveRoom(self.id, RoomType.User);
    };
  });

  return children;
}
