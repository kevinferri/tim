import {
  handleActiveUserAttributeChange,
  handleActiveUserStateChange,
} from "../lib/user-change-handler";
import { NotificationType, emitNotification } from "../lib/notifications";
import { HandlerArgs, SocketEvent } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";

function respondHandler({
  socket,
  server,
  topicId,
  event,
}: HandlerArgs & { topicId: string; event: SocketEvent }) {
  const roomKey = getRoomKeyOrFail({
    socket,
    id: topicId,
    roomType: RoomType.Topic,
  });

  if (!roomKey) return;

  server.to(roomKey).emit(event, {
    userId: socket.data.user.id,
    state: socket.data.user.state,
  });
}

export function handleUserTabFocused({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserTabFocused, async ({ topicId }) => {
    handleActiveUserStateChange(socket, { isIdle: false });

    respondHandler({
      socket,
      server,
      topicId,
      event: SocketEvent.UserTabFocused,
    });
  });
}

export function handleUserTabBlurred({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserTabBlurred, async ({ topicId }) => {
    handleActiveUserStateChange(socket, { isIdle: true });

    respondHandler({
      socket,
      server,
      topicId,
      event: SocketEvent.UserTabBlurred,
    });
  });
}

export function handleUserStartedTyping({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserStartedTyping, async ({ topicId }) => {
    handleActiveUserStateChange(socket, { isTyping: true });

    respondHandler({
      socket,
      server,
      topicId,
      event: SocketEvent.UserStartedTyping,
    });
  });
}

export function handleUserStoppedTyping({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserStoppedTyping, async ({ topicId }) => {
    handleActiveUserStateChange(socket, { isTyping: false });

    respondHandler({
      socket,
      server,
      topicId,
      event: SocketEvent.UserStoppedTyping,
    });
  });
}

export function handleUserExpandedImage({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserExpandedImage, async ({ topicId, messageId }) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    await emitNotification({
      server,
      roomKey,
      messageId,
      topicId,
      actor: socket.data.user,
      notificationType: NotificationType.ExpandedImage,
    });
  });
}

export function handleUserClickedLink({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserClickedLink, async ({ topicId, messageId }) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    await emitNotification({
      server,
      roomKey,
      messageId,
      topicId,
      actor: socket.data.user,
      notificationType: NotificationType.ClickedLink,
    });
  });
}

export function handleUserUpdatedStatus({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserUpdatedStatus, async (payload) => {
    if (payload.user.id !== socket.data.user.id) return;

    const roomKeys = (payload.circleIds as string[])
      .map((circleId) =>
        getRoomKeyOrFail({ socket, id: circleId, roomType: RoomType.Circle })
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
