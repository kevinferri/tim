import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";

export function handleCreateTopic({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.CreateTopic, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.circleId,
      roomType: RoomType.Circle,
    });

    if (!roomKey) return;

    server.to(roomKey).emit(SocketEvent.CreateTopic, payload);
  });
}
