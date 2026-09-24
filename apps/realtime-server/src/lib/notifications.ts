import { NotificationType, RoomType } from "@tim/socket-types";
import { SocketEvent } from "../event-handlers/main";
import { toRoomKey } from "../event-handlers/rooms";
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

// Persists the notification, and separately pushes it live to the
// receiver's own user room -- every one of their sockets joins it for the
// life of the session (see UserRoomConnect), regardless of which topic or
// circle they're currently viewing, so this reaches them anywhere in the
// app rather than only while they're looking at the room the event happened
// in. The two are independent: an offline receiver still gets the
// persisted row, they just won't see it until they load their notifications.
async function notifyUser({
  server,
  receiverId,
  actor,
  topicId,
  messageId,
  notificationType,
}: {
  server: AppServer;
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

  server
    .to(toRoomKey({ id: receiverId, roomType: RoomType.User }))
    .emit(SocketEvent.CreateNotification, {
      notificationType,
      topicId,
      messageId,
      actor,
    });

  await persisted;
}

type Args = {
  server: AppServer;
  topicId: string;
  messageId: string;
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
  actor,
  notificationType,
  receiverId,
}: Args) {
  if (!messageId) return;

  let resolvedReceiverId = receiverId;
  if (!resolvedReceiverId) {
    const message = await getMessageOwnerInTopic({ messageId, topicId });
    if (!message) return;
    resolvedReceiverId = message.userId;
  }

  await notifyUser({
    server,
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
  actor,
  mentionedUserIds,
}: {
  server: AppServer;
  topicId: string;
  messageId: string;
  actor: Actor;
  mentionedUserIds: string[];
}) {
  if (!messageId || mentionedUserIds.length === 0) return;

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
        receiverId,
        actor,
        topicId,
        messageId,
        notificationType: NotificationType.Mentioned,
      }),
    ),
  );
}
