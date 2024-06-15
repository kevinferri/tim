import { type Server } from "socket.io";
import { SocketEvent } from "../event-handlers/main";

export enum NotificationType {
  HighlightRecieved = "highlight:recieved",
  HighlightRemoved = "highlight:removed",
  ExpandedImage = "image:expanded",
}

type Args = {
  server: Server;
  topicId: string;
  messageId: string;
  roomKey: string;
  notificationType: NotificationType;
  actor: {
    id: string;
    name: string;
    imageUrl: string;
  };
};

export async function emitNotification({
  server,
  topicId,
  messageId,
  roomKey,
  actor,
  notificationType,
}: Args) {
  if (!roomKey || !messageId) return;

  const message = await pgClient("messages")
    .select("messages.id", "messages.userId")
    .where("messages.id", messageId)
    .where("messages.topicId", topicId)
    .first();

  if (!message) return;

  const recieverSocket = (await server.in(roomKey).fetchSockets()).find(
    ({ data }) => data.user.id === message.userId
  );

  if (message.userId === actor.id) return;

  if (recieverSocket) {
    recieverSocket.emit(SocketEvent.CreateNotification, {
      notificationType,
      topicId,
      messageId,
      actor,
    });
  }
}
