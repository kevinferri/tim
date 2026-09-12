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
  const hasTriggeredAuthReload = useRef(false);

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
      // Dismiss (not just forget) so a disconnect landing inside a still-visible "restored" toast's 5s window doesn't stack a duplicate on the next reconnect.
      if (reconnectToastRef.current) {
        reconnectToastRef.current.dismiss();
      }
      reconnectToastRef.current = null;
    }

    // "connect"/"disconnect" only fire for a connection that was established and then dropped; if it never connects at all (bad URL, server down), "connect_error" is the only signal, so isConnected must be driven from here too.
    function onConnectError(err: Error) {
      // `auth` is captured once at socket construction and never refreshed, so a socket older than the 24h JWT expiry retries forever with the same stale token -- reload to pick up a fresh one instead of looping on "Invalid credentials".
      if (err.message === "Invalid credentials" && !hasTriggeredAuthReload.current) {
        hasTriggeredAuthReload.current = true;
        window.location.reload();
        return;
      }

      setIsConnected(false);
      showDisconnectedToast();
    }

    function onReconnect() {
      // Room membership and topic data resync themselves off `isConnected`/useRoomResyncOnConnect -- this handler only owns reconnect UX plus refreshing the server-rendered nav lists, which neither of those cover.
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
