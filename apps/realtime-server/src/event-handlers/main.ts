import { type Server, type Socket } from "socket.io";
import { handleDeleteMessage, handleSendMessage } from "./messages";
import { handleClientConnected, handleClientDisconnected } from "./socket";
import { handleJoinRoom, handleLeaveRoom } from "./rooms";
import { handleOnAny, handleOnAnyOutgoing } from "./any";
import { handleCreatedTopic } from "./topics";
import { handleToggleHighlight } from "./highlights";

export type HandlerArgs = {
  server: Server;
  socket: Socket;
};

export enum SocketEvent {
  // socket.io interals
  Connection = "connection",
  Disconnect = "disconnect",

  // custom
  SendMessage = "message:send",
  DeleteMessage = "message:delete",
  JoinRoom = "room:join",
  LeaveRoom = "room:leave",
  CreatedTopic = "topic:created",
  ToggleHighlight = "highlight:toggle",
  AddedHighlight = "highlight:added",
  RemovedHighlight = "highlight:removed",
}

export function registerEventHandlers(server: Server) {
  server.on(SocketEvent.Connection, (socket) => {
    socket.use((_, next) => {
      if (!socket.data.user) {
        return next(new Error("Unauthorized"));
      }

      next();
    });

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
    handleSendMessage({ socket, server });
    handleDeleteMessage({ socket, server });

    // Topic action handlers
    handleCreatedTopic({ socket, server });

    // Highlights
    handleToggleHighlight({ socket, server });
  });
}
