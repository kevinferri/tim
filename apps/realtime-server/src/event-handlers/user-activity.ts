import {
  handleActiveUserAttributeChange,
  handleActiveUserStateChange,
} from "../lib/user-change-handler";
import { NotificationType, emitNotification } from "../lib/notifications";
import { HandlerArgs, SocketEvent } from "./main";
import { RoomType, getRoomKeyOrFail, registerRoomEvent } from "./rooms";

// The local state change must run unconditionally -- a stale/racing room id
// (e.g. a client mid room-switch) should only skip the broadcast below, not
// silently drop the socket's own isIdle/isTyping flag.
function respondToStateChange({
  socket,
  server,
  id,
  roomType,
  event,
}: HandlerArgs & { id: string; roomType: RoomType; event: SocketEvent }) {
  const roomKey = getRoomKeyOrFail({ socket, id, roomType });

  if (!roomKey) return;

  server.to(roomKey).emit(event, {
    userId: socket.data.user.id,
    state: socket.data.user.state,
  });
}

export function handleUserTabFocused({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserTabFocused, ({ topicId }) => {
    handleActiveUserStateChange(socket, { isIdle: false });
    respondToStateChange({
      socket,
      server,
      id: topicId,
      roomType: RoomType.Topic,
      event: SocketEvent.UserTabFocused,
    });
  });
}

export function handleUserTabBlurred({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserTabBlurred, ({ topicId }) => {
    handleActiveUserStateChange(socket, { isIdle: true });
    respondToStateChange({
      socket,
      server,
      id: topicId,
      roomType: RoomType.Topic,
      event: SocketEvent.UserTabBlurred,
    });
  });
}

export function handleUserStartedTyping({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserStartedTyping, ({ topicId }) => {
    handleActiveUserStateChange(socket, { isTyping: true });
    respondToStateChange({
      socket,
      server,
      id: topicId,
      roomType: RoomType.Topic,
      event: SocketEvent.UserStartedTyping,
    });
  });
}

export function handleUserStoppedTyping({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserStoppedTyping, ({ topicId }) => {
    handleActiveUserStateChange(socket, { isTyping: false });
    respondToStateChange({
      socket,
      server,
      id: topicId,
      roomType: RoomType.Topic,
      event: SocketEvent.UserStoppedTyping,
    });
  });
}

export function handleUserExpandedImage({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.UserExpandedImage,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: async ({ socket, server, payload }) => {
      await emitNotification({
        server,
        messageId: payload.messageId,
        topicId: payload.topicId,
        actor: socket.data.user,
        notificationType: NotificationType.ExpandedImage,
      });
    },
  });
}

export function handleUserClickedLink({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.UserClickedLink,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: async ({ socket, server, payload }) => {
      await emitNotification({
        server,
        messageId: payload.messageId,
        topicId: payload.topicId,
        actor: socket.data.user,
        notificationType: NotificationType.ClickedLink,
      });
    },
  });
}

export function handleUserUpdatedStatus({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserUpdatedStatus, async (payload) => {
    if (payload.user.id !== socket.data.user.id) return;

    const roomKeys = (payload.circleIds as string[])
      .map((circleId) =>
        getRoomKeyOrFail({ socket, id: circleId, roomType: RoomType.Circle }),
      )
      .filter((roomKey): roomKey is string => Boolean(roomKey));

    if (roomKeys.length === 0) return;

    handleActiveUserAttributeChange(socket, {
      status: payload.user.status,
      lastStatusUpdate: payload.user.lastStatusUpdate,
    });

    // .to() with multiple rooms dedupes recipients in a single emit, so a
    // client in more than one shared circle only gets this once.
    server.to(roomKeys).emit(SocketEvent.UserUpdatedStatus, payload);
  });
}
