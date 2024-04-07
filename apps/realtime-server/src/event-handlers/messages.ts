import { decrypt } from "../db/encryption";
import { deleteMessage, writeMessage } from "../db/mutations";
import { HandlerArgs, SocketEvent } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";

export function handleSendMessage({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.SendMessage, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    const savedMessage = await writeMessage({
      userId: socket.data.user.id,
      text: payload.message,
      topicId: payload.topicId,
    });

    const emittedMessage = {
      ...savedMessage,
      text: decrypt(savedMessage.text),
      sentBy: socket.data.user,
      createdAt: new Date(),
      highlights: [],
    };

    server.to(roomKey).emit(SocketEvent.SendMessage, emittedMessage);
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
      topicId: payload.topicId,
    });

    if (!deletedMessage) return;

    server
      .to(roomKey)
      .emit(SocketEvent.DeleteMessage, { deletedMessageId: deletedMessage.id });
  });
}
