import { HandlerArgs, SocketEvent } from "./main";
import { pgClient } from "../db/client";
import { toggleHighlight } from "../db/mutations";
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

    // Highlight added
    if (Boolean(highlight)) {
      const createdBy = await pgClient("users")
        .select("id", "imageUrl", "name")
        .where("id", highlight.userId)
        .first();

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

    // Highlight removed
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
