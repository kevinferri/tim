"use client";

import { createContext, useContext, useEffect } from "react";
import { Socket, io } from "socket.io-client";

const SocketContext = createContext<Socket | undefined>(undefined);

export function SocketProvider({
  endpoint,
  path,
  jwt,
  children,
}: {
  endpoint: string;
  path: string;
  jwt?: string;
  children: React.ReactNode;
}) {
  const socket = io(endpoint, {
    path,
    autoConnect: false,
    auth: {
      token: jwt,
    },
  });

  useEffect(() => {
    if (jwt) socket.connect();
  }, [jwt, socket]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside useSocketProvider");
  }

  return context;
}
