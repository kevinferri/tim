import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, toRoomKey } from "./rooms";

export function handleCreatedCircle({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.CreatedCircle, async (payload) => {
    payload.members.forEach((userId: string) => {
      const roomKey = toRoomKey({
        id: userId,
        roomType: RoomType.User,
      });

      if (roomKey) {
        server.to(roomKey).emit(SocketEvent.CreatedCircle, payload);
      }
    });
  });
}
