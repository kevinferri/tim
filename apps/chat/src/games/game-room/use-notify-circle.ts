"use client";

import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";

/** Call after the server saved circle notifications so circle-mates' open tabs refetch them now. */
export function useNotifyCircle() {
  const { emit } = useSocketEmit<{ circleId: string }>(
    SocketEvent.CircleNotificationsChanged,
  );
  return (circleId: string) => emit({ circleId });
}
