import { HandlerArgs, SocketEvent } from "./main";
import { toggleHighlight } from "../db/highlights";
import { getUserSummary } from "../db/users";
import { RoomType, getRoomKeyOrFail } from "./rooms";
import { NotificationType, emitNotification } from "../lib/notifications";

export function handleToggleHighlight({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.ToggleHighlight, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    const highlight = await toggleHighlight({
      userId: socket.data.user.id,
      messageId: payload.messageId,
    });

    const notificationPayload = {
      server,
      roomKey,
      messageId: payload.messageId,
      topicId: payload.topicId,
      actor: socket.data.user,
    };

    if (highlight) {
      const createdBy = await getUserSummary({ userId: highlight.userId });

      server.to(roomKey).emit(SocketEvent.AddedHighlight, {
        highlight,
        createdBy,
      });

      await emitNotification({
        ...notificationPayload,
        notificationType: NotificationType.HighlightRecieved,
      });

      return;
    }

    server.to(roomKey).emit(SocketEvent.RemovedHighlight, {
      messageId: payload.messageId,
      userId: socket.data.user.id,
    });

    await emitNotification({
      ...notificationPayload,
      notificationType: NotificationType.HighlightRemoved,
    });
  });
}
