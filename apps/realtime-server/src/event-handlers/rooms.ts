import { Socket } from "socket.io";
import { isUserInTopic } from "../db/queries";
import { EventName, HandlerArgs } from "./main";

export enum RoomType {
  Topic = "topic",
  Circle = "circle",
  User = "user",
}

export function toRoomKey({
  id,
  roomType,
}: {
  id: string;
  roomType: RoomType;
}) {
  return `${roomType}::${id}`;
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

  return true;
}

export function handleJoinRoom({ socket }: HandlerArgs) {
  socket.on(
    EventName.JoinRoom,
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
  socket.on(EventName.LeaveRoom, (payload) => {
    if (!payload.id || !payload.roomType) return;

    const { id, roomType } = payload;

    socket.leave(toRoomKey({ id, roomType }));
  });
}
