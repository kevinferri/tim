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
      // Dismiss (not just forget) any still-visible "restored" toast from
      // a prior reconnect -- on a flapping connection, a new disconnect
      // can land within that toast's 5s duration, and without an explicit
      // dismiss here the next reconnect would add a second one on top of
      // it instead of replacing it.
      if (reconnectToastRef.current) {
        reconnectToastRef.current.dismiss();
      }
      reconnectToastRef.current = null;
    }

    // The socket starts disconnected and only ever emits "disconnect"
    // for a connection that was established and then dropped -- if it
    // never manages to connect in the first place (bad URL, server
    // down), neither "connect" nor "disconnect" ever fires, and
    // isConnected would stay stuck at `undefined` forever. socket.io
    // retries automatically and re-emits "connect_error" on every
    // failed attempt, which is the actual signal for that case.
    function onConnectError(err: Error) {
      // The socket JWT is minted once per page load and expires after
      // 24h -- a socket that's been open longer than that reconnects
      // (network blip, laptop sleep, a deploy) with the same now-expired
      // token every retry, since `auth` is captured once at construction
      // rather than refreshed per attempt. Retrying can never succeed in
      // that case, so force a hard reload to pick up a fresh token
      // instead of looping on "Invalid credentials" forever.
      if (err.message === "Invalid credentials" && !hasTriggeredAuthReload.current) {
        hasTriggeredAuthReload.current = true;
        window.location.reload();
        return;
      }

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
