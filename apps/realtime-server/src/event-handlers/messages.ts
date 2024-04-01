import { decrypt } from "../db/encryption";
import { writeMessage } from "../db/mutations";
import { HandlerArgs, IncomingEvent, OutgoingEvent } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";

export function handleChatMessage({ socket, server }: HandlerArgs) {
  socket.on(IncomingEvent.SendMessage, async (payload) => {
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

    server.to(roomKey).emit(OutgoingEvent.MessageProcessed, emittedMessage);
  });
}
