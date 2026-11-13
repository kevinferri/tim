import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, registerRoomEvent } from "./rooms";

// Relays a content-free refetch ping to the circle's other sockets. Being in
// the circle room is the only trust needed, and it costs no DB queries.
export function handleCircleNotificationsChanged({
  socket,
  server,
}: HandlerArgs) {
  registerRoomEvent<{ circleId?: unknown } | undefined>({
    socket,
    server,
    event: SocketEvent.CircleNotificationsChanged,
    roomType: RoomType.Circle,
    getId: (payload) =>
      typeof payload?.circleId === "string" ? payload.circleId : "",
    handler: ({ socket, roomKey, payload }) => {
      socket.to(roomKey).emit(SocketEvent.CircleNotificationsChanged, {
        circleId: payload!.circleId,
      });
    },
  });
}
