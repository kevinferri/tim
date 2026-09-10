import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, emitUserChangeInTopic, parseRoomKey } from "./rooms";

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
      const { roomType, id: roomId } = parseRoomKey(roomKey);

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
