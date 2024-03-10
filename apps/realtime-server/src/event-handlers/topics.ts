import { IncomingEvent, HandlerArgs, OutgoingEvent } from "./main";
import { RoomType, toRoomKey } from "./rooms";

export function handleCreateTopic({ socket, server }: HandlerArgs) {
  socket.on(IncomingEvent.CreateTopic, async (payload) => {
    server
      .to(toRoomKey({ id: payload.circleId, roomType: RoomType.Circle }))
      .emit(OutgoingEvent.CreatedTopicProcessed, payload);
  });
}
