import { HandlerArgs, SocketEvent } from "./main";
import { pgClient } from "../db/client";
import { toggleHighlight } from "../db/mutations";
import { RoomType, getRoomKeyOrFail } from "./rooms";

export function handleToggleHighlight({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.ToggleHighlight, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    const highlight = await toggleHighlight({
      userId: socket.data.user.id,
      messageId: payload.messageId,
    });

    // Highlight added
    if (Boolean(highlight)) {
      const createdBy = await pgClient("users")
        .select("id", "imageUrl")
        .where("id", highlight.userId)
        .first();

      server.to(roomKey).emit(SocketEvent.AddedHighlight, {
        highlight,
        createdBy,
      });

      return;
    }

    // Highlight removed
    server.to(roomKey).emit(SocketEvent.RemovedHighlight, {
      messageId: payload.messageId,
      userId: socket.data.user.id,
    });
  });
}
