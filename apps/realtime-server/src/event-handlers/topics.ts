import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";

export function handleCreatedTopic({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.CreatedTopic, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.circleId,
      roomType: RoomType.Circle,
    });

    if (!roomKey) return;

    server.to(roomKey).emit(SocketEvent.CreatedTopic, payload);
  });
}
