import { decrypt } from "../lib/encryption";
import {
  deleteMessage,
  editMessage,
  getMessageForUser,
  writeMessage,
} from "../db/messages";
import { isUserInTopic } from "../db/topics";
import { getRandomGif } from "../lib/media-fetchers";
import { HandlerArgs, SocketEvent } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";
import { executeCommand } from "../lib/command-handler";
import { parseCommand } from "@tim/commands";
import { emitMentionNotifications } from "../lib/notifications";

export function handleSendMessage({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.SendMessage, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.circleId,
      roomType: RoomType.Circle,
    });

    if (!roomKey) return;

    // payload.circleId only proves membership in *some* circle room -- it
    // doesn't prove payload.topicId (used below to persist the message)
    // actually belongs to that circle, so a member of one circle could
    // otherwise inject a message into an unrelated topic they were never
    // added to.
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

    const savedMessage = await writeMessage({
      userId: socket.data.user.id,
      text: payload.message,
      topicId: payload.topicId,
      mediaUrl: _mediaUrl,
    });

    const emittedMessage = {
      ...savedMessage,
      circleId: payload.circleId,
      text: decrypt(savedMessage.text),
      sentBy: socket.data.user,
      createdAt: new Date(),
      highlights: [],
    };

    server.to(roomKey).emit(SocketEvent.SendMessage, emittedMessage);

    await emitMentionNotifications({
      server,
      roomKey,
      topicId: payload.topicId,
      messageId: savedMessage.id,
      actor: socket.data.user,
      mentionedUserIds: payload.mentionedUserIds ?? [],
    });
  });
}

export function handleDeleteMessage({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.DeleteMessage, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    const deletedMessage = await deleteMessage({
      userId: socket.data.user.id,
      messageId: payload.messageId,
    });

    if (!deletedMessage) return;

    server
      .to(roomKey)
      .emit(SocketEvent.DeleteMessage, { deletedMessageId: deletedMessage.id });
  });
}

export function handleEditMessage({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.EditMessage, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey || !payload.text) return;

    const editiedMessage = await editMessage({
      userId: socket.data.user.id,
      messageId: payload.messageId,
      text: payload.text,
    });

    if (!editiedMessage) return;

    server.to(roomKey).emit(SocketEvent.EditMessage, {
      ...editiedMessage,
      text: decrypt(editiedMessage.text),
    });
  });
}

export function handleShuffleGif({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.ShuffleGifMessage, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    const message = await getMessageForUser({
      messageId: payload.messageId,
      userId: socket.data.user.id,
    });

    if (!message) return;

    const text = decrypt(message.text);
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
  });
}
