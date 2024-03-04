import { EventName, HandlerArgs } from "./main";
import { RoomType, toRoomKey } from "./rooms";

export function handleCreateTopic({ socket, server }: HandlerArgs) {
  socket.on(EventName.CreateTopic, async (payload) => {
    server
      .to(toRoomKey({ id: payload.circleId, roomType: RoomType.Circle }))
      .emit(EventName.CreatedTopicProcessed, payload);
  });
}
