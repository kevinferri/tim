import { IncomingEvent, HandlerArgs, OutgoingEvent } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";

export function handleCreateTopic({ socket, server }: HandlerArgs) {
  socket.on(IncomingEvent.CreateTopic, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.circleId,
      roomType: RoomType.Circle,
    });

    if (!roomKey) return;

    server.to(roomKey).emit(OutgoingEvent.CreatedTopicProcessed, payload);
  });
}
