import { NotificationType } from "@tim/socket-types";
import { SocketEvent } from "../event-handlers/main";
import { getMessageOwnerInTopic } from "../db/messages";
import { isUserInTopic } from "../db/topics";
import { createNotification } from "../db/notifications";
import { AppServer } from "./socket";

export { NotificationType };

type Actor = {
  id: string;
  name: string;
  imageUrl: string;
};

// Persists the notification and, if the receiver happens to be connected to
// this room right now, also pushes it live -- the two are independent: a
// receiver who isn't currently looking at this topic still gets the
// persisted row, they just won't see it until they load their notifications.
async function notifyUser({
  server,
  roomKey,
  receiverId,
  actor,
  topicId,
  messageId,
  notificationType,
}: {
  server: AppServer;
  roomKey: string;
  receiverId: string;
  actor: Actor;
  topicId: string;
  messageId: string;
  notificationType: NotificationType;
}) {
  if (receiverId === actor.id) return;

  const persisted = createNotification({
    type: notificationType,
    recipientId: receiverId,
    actorId: actor.id,
    messageId,
  }).catch((err) => {
    console.error("Failed to persist notification", err);
  });

  const receiverSocket = (await server.in(roomKey).fetchSockets()).find(
    ({ data }) => data.user.id === receiverId,
  );

  if (receiverSocket) {
    receiverSocket.emit(SocketEvent.CreateNotification, {
      notificationType,
      topicId,
      messageId,
      actor,
    });
  }

  await persisted;
}

type Args = {
  server: AppServer;
  topicId: string;
  messageId: string;
  roomKey: string;
  notificationType: NotificationType;
  actor: Actor;
  // When set, skip the message-owner lookup (e.g. Replied: notify the
  // quoted author while messageId points at the new reply for the preview).
  receiverId?: string;
};

// For notifications about something that happened to a specific message
// (highlighted, image expanded, link clicked) -- the receiver is that
// message's original author, unless receiverId is provided explicitly.
export async function emitNotification({
  server,
  topicId,
  messageId,
  roomKey,
  actor,
  notificationType,
  receiverId,
}: Args) {
  if (!roomKey || !messageId) return;

  let resolvedReceiverId = receiverId;
  if (!resolvedReceiverId) {
    const message = await getMessageOwnerInTopic({ messageId, topicId });
    if (!message) return;
    resolvedReceiverId = message.userId;
  }

  await notifyUser({
    server,
    roomKey,
    receiverId: resolvedReceiverId,
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
  server: AppServer;
  topicId: string;
  messageId: string;
  roomKey: string;
  actor: Actor;
  mentionedUserIds: string[];
}) {
  if (!roomKey || !messageId || mentionedUserIds.length === 0) return;

  const uniqueReceiverIds = Array.from(new Set(mentionedUserIds));

  const membership = await Promise.all(
    uniqueReceiverIds.map((receiverId) =>
      isUserInTopic({ userId: receiverId, topicId }),
    ),
  );
  const authorizedReceiverIds = uniqueReceiverIds.filter(
    (_, index) => membership[index],
  );

  await Promise.all(
    authorizedReceiverIds.map((receiverId) =>
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
