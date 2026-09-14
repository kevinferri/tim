import { HandlerArgs, SocketEvent } from "./main";
import { toggleHighlight } from "../db/highlights";
import { getUserSummary } from "../db/users";
import { RoomType, registerRoomEvent } from "./rooms";
import { NotificationType, emitNotification } from "../lib/notifications";

export function handleToggleHighlight({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.ToggleHighlight,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: async ({ socket, server, payload, roomKey }) => {
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
    },
  });
}
