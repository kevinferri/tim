import { type Server, type Socket } from "socket.io";
import { handleChatMessage } from "./messages";
import { handleClientConnected, handleClientDisconnected } from "./socket";
import { handleJoinRoom, handleLeaveRoom } from "./rooms";
import { handleOnAny, handleOnAnyOutgoing } from "./any";
import { handleCreateTopic } from "./topics";

export type HandlerArgs = {
  server: Server;
  socket: Socket;
};

export enum IncomingEvent {
  Connection = "connection",
  Disconnect = "disconnect",
  SendMessage = "send message",
  JoinRoom = "join room",
  LeaveRoom = "leave room",
  CreateTopic = "create topic",
}

export enum OutgoingEvent {
  MessageProcessed = "message processed",
  CreatedTopicProcessed = "created topic processed",
}

export function registerEventHandlers(server: Server) {
  server.on(IncomingEvent.Connection, (socket) => {
    // Log emitted and handled events
    handleOnAny({ socket, server });
    handleOnAnyOutgoing({ socket, server });

    // Handle client connection/disconnection
    handleClientConnected({ socket, server });
    handleClientDisconnected({ socket, server });

    // Room handlers
    handleJoinRoom({ socket, server });
    handleLeaveRoom({ socket, server });

    // Chat message handlers
    handleChatMessage({ socket, server });

    // Topic action handlers
    handleCreateTopic({ socket, server });
  });
}
