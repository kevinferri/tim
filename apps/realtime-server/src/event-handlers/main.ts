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
import { handleUpsertedTopic } from "./topics";
import { handleToggleHighlight } from "./highlights";
import { handleUpsertedCircle } from "./circles";
import {
  handleUserExpandedImage,
  handleUserStartedTyping,
  handleUserStoppedTyping,
  handleUserTabBlurred,
  handleUserTabFocused,
} from "./user-activity";

export type HandlerArgs = {
  server: Server;
  socket: Socket;
};

export enum SocketEvent {
  // socket.io internals
  Connection = "connection",
  Disconnect = "disconnect",
  Disconnecting = "disconnecting",

  // messages
  SendMessage = "message:send",
  DeleteMessage = "message:delete",
  EditMessage = "message:edit",
  ShuffleGifMessage = "message:shuffleGif",

  // rooms
  JoinRoom = "room:join",
  LeaveRoom = "room:leave",

  // topics
  UpsertedTopic = "topic:upserted",
  UserJoinedOrLeftTopic = "topic:userJoinedOrLeft",

  // circles
  UpsertedCircle = "circle:upserted",
  UserJoinedCircle = "circle:userJoined",
  UserLeftCircle = "circle:userLeft",

  // highlights
  ToggleHighlight = "highlight:toggle",
  AddedHighlight = "highlight:added",
  RemovedHighlight = "highlight:removed",

  // user activity
  UserTabFocused = "user:tabFocused",
  UserTabBlurred = "user:tabBlurred",
  UserStartedTyping = "user:startedTyping",
  UserStoppedTyping = "user:stoppedTyping",
  UserExpandedImage = "user:expandedImage",

  // notifications
  CreateNotification = "notification:create",
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
    handleClientDisconnecting({ socket, server });
    handleClientDisconnected({ socket, server });

    // Room handlers
    handleJoinRoom({ socket, server });
    handleLeaveRoom({ socket, server });

    // Chat message handlers
    handleSendMessage({ socket, server });
    handleDeleteMessage({ socket, server });
    handleEditMessage({ socket, server });
    handleShuffleGif({ socket, server });

    // Circle action handlers
    handleUpsertedCircle({ socket, server });

    // Topic action handlers
    handleUpsertedTopic({ socket, server });

    // Highlights
    handleToggleHighlight({ socket, server });

    // User activity
    handleUserTabFocused({ socket, server });
    handleUserTabBlurred({ socket, server });
    handleUserStartedTyping({ socket, server });
    handleUserStoppedTyping({ socket, server });
    handleUserExpandedImage({ socket, server });
  });
}
