import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, toRoomKey } from "./rooms";

export function handleUpsertedCircle({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UpsertedCircle, async (payload) => {
    payload.members.forEach((userId: string) => {
      const roomKey = toRoomKey({
        id: userId,
        roomType: RoomType.User,
      });

      if (roomKey) {
        server.to(roomKey).emit(SocketEvent.UpsertedCircle, payload);
      }
    });
  });
}

export function handleDeletedCircle({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.DeletedCircle, async (payload) => {
    payload.members.forEach((userId: string) => {
      const roomKey = toRoomKey({
        id: userId,
        roomType: RoomType.User,
      });

      if (roomKey) {
        server.to(roomKey).emit(SocketEvent.DeletedCircle, payload);
      }
    });
  });
}
