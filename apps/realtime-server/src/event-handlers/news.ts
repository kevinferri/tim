import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, registerRoomEvent } from "./rooms";

// Relays a content-free "refetch your news sources" ping to the circle's other sockets after the chat app adds or removes a source.
export function handleNewsSourcesChanged({ socket, server }: HandlerArgs) {
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
