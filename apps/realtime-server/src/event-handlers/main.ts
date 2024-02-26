import { type Server, type Socket } from "socket.io";
import { handleChatMessage } from "./messages";
import { handleClientConnected, handleClientDisconnected } from "./socket";
import { handleJoinRoom, handleLeaveRoom } from "./rooms";

export type HandlerArgs = {
  server: Server;
  socket: Socket;
};

export enum EventName {
  Connection = "connection",
  Disconnect = "disconnect",
  SendMessage = "send message",
  MessageProcessed = "message processed",
  JoinRoom = "join room",
}

export function registerEventHandlers(server: Server) {
  server.on(EventName.Connection, (socket) => {
    // Handle client connection/disconnection
    handleClientConnected({ socket, server });
    handleClientDisconnected({ socket, server });

    // Chat message handlers
    handleChatMessage({ socket, server });

    // Room handlers
    handleJoinRoom({ socket, server });
    handleLeaveRoom({ socket, server });
  });
}
