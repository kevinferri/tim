import { decrypt } from "../db/encryption";
import { writeMessage } from "../db/mutations";
import { isUserInTopic } from "../db/queries";
import { HandlerArgs, IncomingEvent, OutgoingEvent } from "./main";
import { RoomType, toRoomKey } from "./rooms";

export function handleChatMessage({ socket, server }: HandlerArgs) {
  socket.on(IncomingEvent.SendMessage, async (payload) => {
    const isInTopic = await isUserInTopic({
      userId: socket.data.user.id,
      topicId: payload.topicId,
    });

    if (!isInTopic) return false;

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

    server
      .to(toRoomKey({ id: payload.topicId, roomType: RoomType.Topic }))
      .emit(OutgoingEvent.MessageProcessed, emittedMessage);
  });
}
