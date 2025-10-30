"use client";

import { useSelf } from "@/components/auth/self-provider";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { useRoomManagement } from "@/components/socket/use-current-user-rooms";

type Props = {
  children: React.ReactNode;
};

export function UserRoomConnect({ children }: Props) {
  const self = useSelf();
  const { joinRoom, leaveRoom } = useRoomManagement();

  useEffectOnce(() => {
    joinRoom(self.id, "user");

    return () => {
      leaveRoom(self.id, "user");
    };
  });

  return children;
}
