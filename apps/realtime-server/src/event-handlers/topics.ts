import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";

export function handleUpsertedTopic({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UpsertedTopic, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.circleId,
      roomType: RoomType.Circle,
    });

    if (!roomKey) return;

    server.to(roomKey).emit(SocketEvent.UpsertedTopic, payload);
  });
}
