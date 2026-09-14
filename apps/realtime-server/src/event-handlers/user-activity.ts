import {
  handleActiveUserAttributeChange,
  handleActiveUserStateChange,
} from "../lib/user-change-handler";
import { NotificationType, emitNotification } from "../lib/notifications";
import { HandlerArgs, SocketEvent } from "./main";
import { RoomType, getRoomKeyOrFail, registerRoomEvent } from "./rooms";

function emitUserState({
  server,
  socket,
  roomKey,
  event,
}: HandlerArgs & { roomKey: string; event: SocketEvent }) {
  server.to(roomKey).emit(event, {
    userId: socket.data.user.id,
    state: socket.data.user.state,
  });
}

export function handleUserTabFocused({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.UserTabFocused,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: ({ socket, server, roomKey }) => {
      handleActiveUserStateChange(socket, { isIdle: false });
      emitUserState({
        server,
        socket,
        roomKey,
        event: SocketEvent.UserTabFocused,
      });
    },
  });
}

export function handleUserTabBlurred({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.UserTabBlurred,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: ({ socket, server, roomKey }) => {
      handleActiveUserStateChange(socket, { isIdle: true });
      emitUserState({
        server,
        socket,
        roomKey,
        event: SocketEvent.UserTabBlurred,
      });
    },
  });
}

export function handleUserStartedTyping({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.UserStartedTyping,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: ({ socket, server, roomKey }) => {
      handleActiveUserStateChange(socket, { isTyping: true });
      emitUserState({
        server,
        socket,
        roomKey,
        event: SocketEvent.UserStartedTyping,
      });
    },
  });
}

export function handleUserStoppedTyping({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.UserStoppedTyping,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: ({ socket, server, roomKey }) => {
      handleActiveUserStateChange(socket, { isTyping: false });
      emitUserState({
        server,
        socket,
        roomKey,
        event: SocketEvent.UserStoppedTyping,
      });
    },
  });
}

export function handleUserExpandedImage({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.UserExpandedImage,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: async ({ socket, server, payload, roomKey }) => {
      await emitNotification({
        server,
        roomKey,
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
    handler: async ({ socket, server, payload, roomKey }) => {
      await emitNotification({
        server,
        roomKey,
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
