import { SocketEvent, HandlerArgs } from "./main";
import { ROOM_KEY_INDICATOR, RoomType, emitUserChangeInTopic } from "./rooms";

export function handleClientConnected({ server }: HandlerArgs) {
  console.log(`📈 clients: ${server.engine.clientsCount}`);
}

export function handleClientDisconnected({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.Disconnect, () => {
    console.log(`📉 clients: ${server.engine.clientsCount}`);
  });
}

export function handleClientDisconnecting({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.Disconnecting, () => {
    socket.rooms.forEach((roomKey) => {
      const [roomType, roomId] = roomKey.split(ROOM_KEY_INDICATOR);

      if (roomType === RoomType.Topic) {
        emitUserChangeInTopic({
          server,
          socket,
          topicId: roomId,
          recordHistory: true,
          disconnectingUser: socket.data.user.id,
        });
      }
    });
  });
}
