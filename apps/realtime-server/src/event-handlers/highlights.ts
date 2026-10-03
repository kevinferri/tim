import { HandlerArgs, SocketEvent } from "./main";
import { toggleHighlight } from "../db/highlights";
import { getUserSummary } from "../db/users";
import { getMessageOwnerInTopic } from "../db/messages";
import { isUserInTopic } from "../db/topics";
import { RoomType, toRoomKey } from "./rooms";
import { NotificationType, emitNotification } from "../lib/notifications";

// Not a registerRoomEvent: a message can be highlighted from outside its
// topic (e.g. the notifications panel), so membership is checked against the
// DB when the socket isn't in that topic's room.
export function handleToggleHighlight({ socket, server }: HandlerArgs) {
  socket.on(
    SocketEvent.ToggleHighlight,
    async (payload: { messageId: string; topicId: string }) => {
      const roomKey = toRoomKey({
        id: payload.topicId,
        roomType: RoomType.Topic,
      });
      const inRoom = socket.rooms.has(roomKey);

      if (
        !inRoom &&
        !(await isUserInTopic({
          userId: socket.data.user.id,
          topicId: payload.topicId,
        }))
      ) {
        return;
      }

      // Room membership alone doesn't prove the message is in this topic.
      if (!(await getMessageOwnerInTopic(payload))) return;

      const highlight = await toggleHighlight({
        userId: socket.data.user.id,
        messageId: payload.messageId,
      });

      // The room broadcast misses an acting socket that isn't in it.
      const broadcast = (event: SocketEvent, data: unknown) => {
        server.to(roomKey).emit(event, data);
        if (!inRoom) socket.emit(event, data);
      };

      const notificationPayload = {
        server,
        messageId: payload.messageId,
        topicId: payload.topicId,
        actor: socket.data.user,
      };

      if (highlight) {
        const createdBy = await getUserSummary({ userId: highlight.userId });

        broadcast(SocketEvent.AddedHighlight, { highlight, createdBy });

        await emitNotification({
          ...notificationPayload,
          notificationType: NotificationType.HighlightRecieved,
        });

        return;
      }

      broadcast(SocketEvent.RemovedHighlight, {
        messageId: payload.messageId,
        userId: socket.data.user.id,
      });

      await emitNotification({
        ...notificationPayload,
        notificationType: NotificationType.HighlightRemoved,
      });
    },
  );
}
