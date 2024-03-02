import { decrypt } from "../db/encryption";
import { writeMessage } from "../db/mutations";
import { HandlerArgs, EventName } from "./main";
import { RoomType, toRoomKey } from "./rooms";

export function handleChatMessage({ socket, server }: HandlerArgs) {
  socket.on(EventName.SendMessage, async (payload) => {
    const savedMessage = await writeMessage({
      userId: socket.data.user.id,
      text: payload.message,
      topicId: payload.topicId,
    });

    const emittedMessage = {
      ...savedMessage,
      text: decrypt(savedMessage.text),
      sentBy: socket.data.user,
    };

    server
      .to(toRoomKey({ id: payload.topicId, roomType: RoomType.Topic }))
      .emit(EventName.MessageProcessed, emittedMessage);
  });
}
