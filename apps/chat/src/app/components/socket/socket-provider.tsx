"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { Socket, io } from "socket.io-client";

const SocketContext = createContext<Socket | undefined>(undefined);

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

  useEffect(() => {
    if (jwt && !prevSocket.current) {
      prevSocket.current = socket;
      socket.connect();
    }
  }, [jwt, socket]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocketContext must be used inside SocketProvider");
  }

  return context;
}

// "use client";

// import { createContext, useContext, useEffect, useMemo, useState } from "react";
// import { Socket, io } from "socket.io-client";
// import { useToast } from "@/components/ui/use-toast";
// import {
//   CheckCircledIcon,
//   ExclamationTriangleIcon,
// } from "@radix-ui/react-icons";

// type ContextValue = {
//   socket: Socket | undefined;
//   socketState: {
//     isConnected: boolean;
//   };
// };

// const SocketContext = createContext<ContextValue | undefined>(undefined);

// export function SocketProvider({
//   endpoint,
//   path,
//   jwt,
//   children,
// }: {
//   endpoint: string;
//   path: string;
//   jwt?: string;
//   children: React.ReactNode;
// }) {
//   const socket = io(endpoint, {
//     path,
//     autoConnect: false,
//     auth: {
//       token: jwt,
//     },
//   });

//   const socketState = useSocketState(socket);

//   useEffect(() => {
//     if (jwt) socket.connect();
//   }, [jwt, socket]);

//   const value = useMemo(
//     () => ({
//       socket,
//       socketState,
//     }),
//     [socket, socketState]
//   );

//   return (
//     <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
//   );
// }

// function useSocketState(socket: Socket) {
//   const [isConnected, setIsConnected] = useState(true);
//   const { toast } = useToast();

//   useEffect(() => {
//     const onConnect = () => {
//       setIsConnected(true);
//     };

//     const onDisconnect = () => {
//       setIsConnected(false);
//       toast({
//         duration: 60000,
//         title: "Disconnected",
//         description: "Attempting to automatically reconnect to the server...",
//         variant: "destructive",
//         action: <ExclamationTriangleIcon />,
//       });
//     };

//     const onReconnect = () => {
//       toast({
//         title: "Connected",
//         description: "You have been successfully reconnected to the server",
//         variant: "success",
//         action: <CheckCircledIcon />,
//       });
//     };

//     socket.on("connect", onConnect);
//     socket.on("disconnect", onDisconnect);
//     socket.io.on("reconnect", onReconnect);

//     return () => {
//       socket.off("connect", onConnect);
//       socket.off("disconnect", onDisconnect);
//       socket.io.off("reconnect", onReconnect);
//     };

//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return useMemo(() => ({ isConnected }), [isConnected]);
// }

// export function useSocketContext() {
//   const context = useContext(SocketContext);

//   if (!context) {
//     throw new Error("useSocket must be used inside useSocketProvider");
//   }

//   return context;
// }
