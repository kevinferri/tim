import { decrypt } from "../lib/encryption";
import {
  deleteMessage,
  editMessage,
  getMessageForReplyPreview,
  getMessageForUser,
  writeMessage,
} from "../db/messages";
import { isUserInTopic } from "../db/topics";
import { getRandomGif } from "../lib/media-fetchers";
import { HandlerArgs, SocketEvent } from "./main";
import { RoomType, registerRoomEvent } from "./rooms";
import { executeCommand } from "../lib/command-handler";
import { parseCommand } from "@tim/commands";
import {
  emitMentionNotifications,
  emitNotification,
  NotificationType,
} from "../lib/notifications";

export function handleSendMessage({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.SendMessage,
    roomType: RoomType.Circle,
    getId: (payload) => payload.circleId,
    handler: async ({ socket, server, payload, roomKey }) => {
      // payload.circleId only proves membership in *some* circle -- doesn't prove payload.topicId belongs to it, so a member of one circle could otherwise post into an unrelated topic.
      const canSendToTopic = await isUserInTopic({
        userId: socket.data.user.id,
        topicId: payload.topicId,
      });

      if (!canSendToTopic) return;

      const commandMediaUrl = await executeCommand(payload.message, {
        socket,
        server,
        payload,
      });
      const _mediaUrl = commandMediaUrl ?? payload.mediaUrl;

      // Re-fetched (not trusted from the payload) and scoped to this topic --
      // doubles as validation that the reply target actually exists here.
      // A stale/invalid/cross-topic id degrades to a plain (non-reply)
      // message rather than failing the whole send.
      const replyToMessage = payload.replyToId
        ? await getMessageForReplyPreview({
            messageId: payload.replyToId,
            topicId: payload.topicId,
          })
        : undefined;

      // Flat threads: hang every reply off the root (parent.threadRootId ??
      // parent.id). replyToId still points at the quoted message.
      const threadRootId = replyToMessage
        ? (replyToMessage.threadRootId ?? replyToMessage.id)
        : undefined;

      const savedMessage = await writeMessage({
        userId: socket.data.user.id,
        text: payload.message,
        topicId: payload.topicId,
        mediaUrl: _mediaUrl,
        replyToId: replyToMessage?.id,
        threadRootId,
        replyToCreatedAt: replyToMessage?.createdAt,
      });

      const emittedMessage = {
        ...savedMessage,
        circleId: payload.circleId,
        text: decrypt(savedMessage.text, savedMessage.id),
        sentBy: socket.data.user,
        // Prefer the persisted timestamp so live order matches refresh.
        createdAt: savedMessage.createdAt ?? new Date(),
        highlights: [],
        replyTo: replyToMessage && {
          id: replyToMessage.id,
          // Message.text is nullable (media-only rows); decrypt() has no null check.
          text: replyToMessage.text
            ? decrypt(replyToMessage.text, replyToMessage.id)
            : "",
          mediaUrl: replyToMessage.mediaUrl,
          sentBy: { id: replyToMessage.userId, name: replyToMessage.name },
        },
      };

      server.to(roomKey).emit(SocketEvent.SendMessage, emittedMessage);

      // One message, one notification: if a reply also @s the quoted author,
      // Replied covers them and Mentioned would just double up. Any other @ in
      // the same reply still gets Mentioned.
      const mentionedUserIds = (payload.mentionedUserIds ?? []).filter(
        (id: string) => id !== replyToMessage?.userId,
      );

      // Independent fan-outs.
      await Promise.all([
        emitMentionNotifications({
          server,
          topicId: payload.topicId,
          messageId: savedMessage.id,
          actor: socket.data.user,
          mentionedUserIds,
        }),
        replyToMessage
          ? emitNotification({
              server,
              topicId: payload.topicId,
              // Preview the reply itself; notify the quoted author directly so we
              // don't look up ownership on the reply (which would be the sender).
              messageId: savedMessage.id,
              receiverId: replyToMessage.userId,
              actor: socket.data.user,
              notificationType: NotificationType.Replied,
            })
          : undefined,
      ]);
    },
  });
}

export function handleDeleteMessage({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.DeleteMessage,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: async ({ socket, server, payload, roomKey }) => {
      const deletedMessage = await deleteMessage({
        userId: socket.data.user.id,
        messageId: payload.messageId,
      });

      if (!deletedMessage) return;

      server.to(roomKey).emit(SocketEvent.DeleteMessage, {
        deletedMessageId: deletedMessage.id,
      });
    },
  });
}

export function handleEditMessage({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.EditMessage,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: async ({ socket, server, payload, roomKey }) => {
      if (!payload.text) return;

      const editiedMessage = await editMessage({
        userId: socket.data.user.id,
        messageId: payload.messageId,
        text: payload.text,
      });

      if (!editiedMessage) return;

      server.to(roomKey).emit(SocketEvent.EditMessage, {
        ...editiedMessage,
        text: decrypt(editiedMessage.text, editiedMessage.id),
      });
    },
  });
}

export function handleShuffleGif({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.ShuffleGifMessage,
    roomType: RoomType.Topic,
    getId: (payload) => payload.topicId,
    handler: async ({ socket, server, payload, roomKey }) => {
      const message = await getMessageForUser({
        messageId: payload.messageId,
        userId: socket.data.user.id,
      });

      if (!message) return;

      const text = decrypt(message.text, message.id);
      const newGif = await getRandomGif(parseCommand(text)?.prompt ?? "");

      const shuffledMessage = await editMessage({
        text,
        userId: socket.data.user.id,
        messageId: message.id,
        mediaUrl: newGif,
      });

      server.to(roomKey).emit(SocketEvent.ShuffleGifMessage, {
        messageId: shuffledMessage.id,
        mediaUrl: shuffledMessage.mediaUrl,
      });
    },
  });
}
