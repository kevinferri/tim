import { type Server } from "socket.io";
import { SocketEvent } from "../event-handlers/main";
import { getMessageOwnerInTopic } from "../db/messages";

export enum NotificationType {
  HighlightRecieved = "highlight:recieved",
  HighlightRemoved = "highlight:removed",
  ExpandedImage = "image:expanded",
  ClickedLink = "link:clicked",
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

  const message = await getMessageOwnerInTopic({ messageId, topicId });

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
