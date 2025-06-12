"use client";

import { createContext, useContext, useRef } from "react";
import { Socket, io } from "socket.io-client";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { useSocketState } from "@/components/socket/use-socket-state";

const SocketContext = createContext<
  { socket: Socket; socketState: ReturnType<typeof useSocketState> } | undefined
>(undefined);

type Props = {
  endpoint: string;
  path: string;
  jwt?: string;
  children: React.ReactNode;
};

export function SocketProvider({ endpoint, path, jwt, children }: Props) {
  const prevSocket = useRef<Socket | undefined>(undefined);
  const socket = !prevSocket.current
    ? io(endpoint, {
        path,
        autoConnect: false,
        auth: {
          token: jwt,
        },
      })
    : prevSocket.current;

  useEffectOnce(() => {
    if (jwt && !prevSocket.current) {
      prevSocket.current = socket;
      socket.connect();
    }
  });

  const socketState = useSocketState(socket);
  const value = { socket, socketState };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocketContext must be used inside SocketProvider");
  }

  return context;
}
