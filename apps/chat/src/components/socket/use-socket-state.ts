"use client";

import { useState } from "react";
import { Socket } from "socket.io-client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffectOnce } from "@/lib/hooks";
import { useToast } from "@/components/ui/use-toast";

const RECONNECT_PARAM = "from-reconnect";

export function useSocketState(socket: Socket) {
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState<boolean>();

  useEffectOnce(() => {
    // socket.connected is initially false for a flash.
    // we set is as undefined initially then get the real state
    setTimeout(() => {
      setIsConnected(socket.connected);
      if (!socket.connected) showDisconnectedToast();
    }, 500);

    function showDisconnectedToast() {
      toast({
        title: `Your connection to our server has been lost`,
        description: `Attempting to reconnect...`,
        variant: "destructive",
        duration: Number.POSITIVE_INFINITY,
      });
    }

    function onConnect() {
      setIsConnected(true);

      if (searchParams.get(RECONNECT_PARAM)) {
        window.history.replaceState(null, "", pathname);

        toast({
          title: `Your connection has been restored  🎉`,
          variant: "success",
          duration: 5000,
        });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
      showDisconnectedToast();
    }

    function onReconnect() {
      window.location.href =
        window.location.pathname + `?${RECONNECT_PARAM}=true`;
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
