import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, registerRoomEvent } from "./rooms";

export function handleNews({ socket, server }: HandlerArgs) {
  // Relays a content-free "refetch your news" ping to the circle's other sockets after the chat app changes its sources or News setting.
  registerRoomEvent<{ circleId?: unknown } | undefined>({
    socket,
    server,
    event: SocketEvent.NewsSourcesChanged,
    roomType: RoomType.Circle,
    getId: (payload) =>
      typeof payload?.circleId === "string" ? payload.circleId : "",
    handler: ({ socket, roomKey, payload }) => {
      socket.to(roomKey).emit(SocketEvent.NewsSourcesChanged, {
        circleId: payload!.circleId,
      });
    },
  });
}
