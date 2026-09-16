import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, registerRoomEvent } from "./rooms";

export function handleUpsertedTopic({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.UpsertedTopic,
    roomType: RoomType.Circle,
    getId: (payload) => payload.circleId,
    handler: ({ server, payload, roomKey }) => {
      server.to(roomKey).emit(SocketEvent.UpsertedTopic, payload);
    },
  });
}

export function handleDeletedTopic({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.DeletedTopic,
    roomType: RoomType.Circle,
    getId: (payload) => payload.circleId,
    handler: ({ server, payload, roomKey }) => {
      server.to(roomKey).emit(SocketEvent.DeletedTopic, payload);
    },
  });
}

export function handleReorderedTopics({ socket, server }: HandlerArgs) {
  registerRoomEvent({
    socket,
    server,
    event: SocketEvent.ReorderedTopics,
    roomType: RoomType.Circle,
    getId: (payload) => payload.circleId,
    handler: ({ server, payload, roomKey }) => {
      server.to(roomKey).emit(SocketEvent.ReorderedTopics, payload);
    },
  });
}
