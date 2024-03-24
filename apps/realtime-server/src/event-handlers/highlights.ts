import { HandlerArgs, IncomingEvent, OutgoingEvent } from "./main";
import { pgClient } from "../db/client";
import { isUserInTopic } from "../db/queries";
import { toggleHighlight } from "../db/mutations";
import { RoomType, toRoomKey } from "./rooms";

export function handleToggleHighlight({ socket, server }: HandlerArgs) {
  socket.on(IncomingEvent.ToggleHighlight, async (payload) => {
    const message = await pgClient("messages")
      .select("id", "topicId")
      .where("id", payload.messageId)
      .first();

    if (!message) return;

    const isInTopic = await isUserInTopic({
      userId: socket.data.user.id,
      topicId: message.topicId,
    });

    if (!isInTopic) return;

    const highlight = await toggleHighlight({
      userId: socket.data.user.id,
      messageId: payload.messageId,
    });

    const roomKey = toRoomKey({
      id: message.topicId,
      roomType: RoomType.Topic,
    });

    // Highlight added
    if (Boolean(highlight)) {
      const user = await pgClient("users")
        .select("id", "imageUrl")
        .where("id", highlight.userId)
        .first();

      server.to(roomKey).emit(OutgoingEvent.AddHighlightProcessed, {
        highlight,
        user,
      });

      return;
    }

    // Highlight removed
    server.to(roomKey).emit(OutgoingEvent.RemoveHighlightProcessed, {
      messageId: payload.messageId,
      userId: socket.data.user.id,
    });
  });
}
