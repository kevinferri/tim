import { Socket } from "socket.io";
import { isUserInCircle, isUserInTopic } from "../db/queries";
import { SocketEvent, HandlerArgs } from "./main";

export enum RoomType {
  Topic = "topic",
  Circle = "circle",
  User = "user",
}

function toRoomKey({ id, roomType }: { id: string; roomType: RoomType }) {
  return `${roomType}::${id}`;
}

export function getRoomKeyOrFail({
  id,
  roomType,
  socket,
}: {
  socket: Socket;
  id: string;
  roomType: RoomType;
}) {
  const roomKey = toRoomKey({
    id,
    roomType,
  });

  if (socket.rooms.has(roomKey)) {
    return roomKey;
  }

  return false;
}

async function canJoinRoom({
  id,
  roomType,
  socket,
}: {
  id: string;
  roomType: RoomType;
  socket: Socket;
}) {
  if (roomType === RoomType.Topic) {
    return await isUserInTopic({ userId: socket.data.user.id, topicId: id });
  }

  if (roomType === RoomType.Circle) {
    return await isUserInCircle({ userId: socket.data.user.id, circleId: id });
  }

  return true;
}

export function handleJoinRoom({ socket }: HandlerArgs) {
  socket.on(
    SocketEvent.JoinRoom,
    async (payload: { id: string; roomType: RoomType }) => {
      if (!payload.id || !payload.roomType) return;

      const { id, roomType } = payload;
      const canJoin = await canJoinRoom({
        id,
        roomType,
        socket,
      });

      if (!canJoin) return;

      socket.join(toRoomKey({ id, roomType }));
    }
  );
}

export function handleLeaveRoom({ socket }: HandlerArgs) {
  socket.on(SocketEvent.LeaveRoom, (payload) => {
    if (!payload.id || !payload.roomType) return;

    const { id, roomType } = payload;

    socket.leave(toRoomKey({ id, roomType }));
  });
}
