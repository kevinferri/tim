import { type Server, type Socket } from "socket.io";
import {
  handleDeleteMessage,
  handleEditMessage,
  handleSendMessage,
  handleShuffleGif,
} from "./messages";
import {
  handleClientConnected,
  handleClientDisconnected,
  handleClientDisconnecting,
} from "./socket";
import { handleJoinRoom, handleLeaveRoom } from "./rooms";
import { handleOnAny, handleOnAnyOutgoing } from "./any";
import { handleDeletedTopic, handleUpsertedTopic } from "./topics";
import { handleToggleHighlight } from "./highlights";
import { handleDeletedCircle, handleUpsertedCircle } from "./circles";
import {
  handleUserClickedLink,
  handleUserExpandedImage,
  handleUserStartedTyping,
  handleUserStoppedTyping,
  handleUserTabBlurred,
  handleUserTabFocused,
  handleUserUpdatedStatus,
} from "./user-activity";

import { SocketEvent } from "@tim/socket-types";

export { SocketEvent };

export type HandlerArgs = {
  server: Server;
  socket: Socket;
};

export function registerEventHandlers(server: Server) {
  server.on(SocketEvent.Connection, (socket) => {
    socket.use((_, next) => {
      if (!socket.data.user) {
        return next(new Error("Unauthorized"));
      }

      next();
    });

    handleOnAny({ socket, server });
    handleOnAnyOutgoing({ socket, server });

    handleClientConnected({ socket, server });
    handleClientDisconnecting({ socket, server });
    handleClientDisconnected({ socket, server });

    handleJoinRoom({ socket, server });
    handleLeaveRoom({ socket, server });

    handleSendMessage({ socket, server });
    handleDeleteMessage({ socket, server });
    handleEditMessage({ socket, server });
    handleShuffleGif({ socket, server });

    handleUpsertedCircle({ socket, server });
    handleDeletedCircle({ socket, server });

    handleUpsertedTopic({ socket, server });
    handleDeletedTopic({ socket, server });

    handleToggleHighlight({ socket, server });

    handleUserTabFocused({ socket, server });
    handleUserTabBlurred({ socket, server });
    handleUserStartedTyping({ socket, server });
    handleUserStoppedTyping({ socket, server });
    handleUserExpandedImage({ socket, server });
    handleUserClickedLink({ socket, server });
    handleUserUpdatedStatus({ socket, server });
  });
}
