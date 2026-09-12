import { type Server } from "socket.io";
import { NotificationType } from "@tim/socket-types";
import { SocketEvent } from "../event-handlers/main";
import { getMessageOwnerInTopic } from "../db/messages";

export { NotificationType };

type Actor = {
  id: string;
  name: string;
  imageUrl: string;
};

// Looks up the receiver's socket in the room and emits, skipping self-
// notifications and receivers who aren't currently connected there.
async function notifyUser({
  server,
  roomKey,
  receiverId,
  actor,
  topicId,
  messageId,
  notificationType,
}: {
  server: Server;
  roomKey: string;
  receiverId: string;
  actor: Actor;
  topicId: string;
  messageId: string;
  notificationType: NotificationType;
}) {
  if (receiverId === actor.id) return;

  const receiverSocket = (await server.in(roomKey).fetchSockets()).find(
    ({ data }) => data.user.id === receiverId,
  );

  if (!receiverSocket) return;

  receiverSocket.emit(SocketEvent.CreateNotification, {
    notificationType,
    topicId,
    messageId,
    actor,
  });
}

type Args = {
  server: Server;
  topicId: string;
  messageId: string;
  roomKey: string;
  notificationType: NotificationType;
  actor: Actor;
};

// For notifications about something that happened to a specific message
// (highlighted, image expanded, link clicked) -- the receiver is that
// message's original author.
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

  await notifyUser({
    server,
    roomKey,
    receiverId: message.userId,
    actor,
    topicId,
    messageId,
    notificationType,
  });
}

// For @mentions -- the receivers are whoever got mentioned in the message,
// not its author (a message can mention several people at once).
export async function emitMentionNotifications({
  server,
  topicId,
  messageId,
  roomKey,
  actor,
  mentionedUserIds,
}: {
  server: Server;
  topicId: string;
  messageId: string;
  roomKey: string;
  actor: Actor;
  mentionedUserIds: string[];
}) {
  if (!roomKey || !messageId || mentionedUserIds.length === 0) return;

  const uniqueReceiverIds = Array.from(new Set(mentionedUserIds));

  await Promise.all(
    uniqueReceiverIds.map((receiverId) =>
      notifyUser({
        server,
        roomKey,
        receiverId,
        actor,
        topicId,
        messageId,
        notificationType: NotificationType.Mentioned,
      }),
    ),
  );
}
