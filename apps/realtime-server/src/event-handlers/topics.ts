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

export function handleDeletedTopic({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.DeletedTopic, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.circleId,
      roomType: RoomType.Circle,
    });

    if (!roomKey) return;

    server.to(roomKey).emit(SocketEvent.DeletedTopic, payload);
  });
}
