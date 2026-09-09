"use client";

import { useState, useRef } from "react";
import { Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { useToast } from "@/components/ui/use-toast";

export function useSocketState(socket: Socket) {
  const router = useRouter();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean>();
  const disconnectToastRef = useRef<{ dismiss: () => void } | null>(null);
  const reconnectToastRef = useRef<{ dismiss: () => void } | null>(null);

  useEffectOnce(() => {
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
      // Let a future reconnect show its own "restored" toast again --
      // without this, the ref from a previous reconnect (auto-dismissed
      // after 5s, but never cleared) permanently suppresses it.
      reconnectToastRef.current = null;
    }

    // The socket starts disconnected and only ever emits "disconnect"
    // for a connection that was established and then dropped -- if it
    // never manages to connect in the first place (bad URL, server
    // down), neither "connect" nor "disconnect" ever fires, and
    // isConnected would stay stuck at `undefined` forever. socket.io
    // retries automatically and re-emits "connect_error" on every
    // failed attempt, which is the actual signal for that case.
    function onConnectError() {
      setIsConnected(false);
      showDisconnectedToast();
    }

    function onReconnect() {
      // Room membership itself is resynced by useRoomResyncOnConnect,
      // and each topic's message/highlight state re-syncs itself off
      // `isConnected` flipping back to true -- this handler only owns
      // reconnect UX, plus refreshing the server-rendered nav lists
      // (circles/topics), which aren't covered by either of those.
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
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect", onReconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect", onReconnect);
    };
  });

  return { isConnected };
}
