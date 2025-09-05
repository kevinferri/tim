"use client";

import { useState, useRef } from "react";
import { Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { useToast } from "@/components/ui/use-toast";
import { SocketEvent } from "@/components/socket/use-socket";
import { useCurrentUserRooms } from "@/components/socket/use-current-user-rooms";

export function useSocketState(socket: Socket) {
  const router = useRouter();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean>();
  const disconnectToastRef = useRef<{ dismiss: () => void } | null>(null);
  const reconnectToastRef = useRef<{ dismiss: () => void } | null>(null);
  const { getJoinedRooms } = useCurrentUserRooms();

  useEffectOnce(() => {
    // socket.connected is initially false for a flash.
    // we set is as undefined initially then get the real state
    setTimeout(() => {
      setIsConnected(socket.connected);
      if (!socket.connected) showDisconnectedToast();
    }, 1500);

    function showDisconnectedToast() {
      if (!disconnectToastRef.current) {
        disconnectToastRef.current = toast({
          title: `Your connection to our server has been lost`,
          description: `Attempting to reconnect...`,
          variant: "destructive",
          duration: Number.POSITIVE_INFINITY,
        });
      }
    }

    function onConnect() {
      setIsConnected(true);

      if (disconnectToastRef.current) {
        disconnectToastRef.current.dismiss();
        disconnectToastRef.current = null;
      }
    }

    function onDisconnect() {
      setIsConnected(false);
      showDisconnectedToast();
    }

    function onReconnect() {
      const rooms = getJoinedRooms();
      rooms.forEach((room) => {
        socket.emit(SocketEvent.JoinRoom, room);
      });

      if (!reconnectToastRef.current) {
        reconnectToastRef.current = toast({
          title: `Your connection has been restored`,
          variant: "success",
          duration: 5000,
        });
      }

      router.refresh();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect", onReconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect", onReconnect);
    };
  });

  return { isConnected };
}
