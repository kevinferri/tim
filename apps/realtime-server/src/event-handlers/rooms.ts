import { Socket } from "socket.io";
import {
  getParentCircleIdForTopic,
  getTopicIdsForCircle,
  isUserInCircle,
  isUserInTopic,
} from "../db/queries";
import { SocketEvent, HandlerArgs } from "./main";
import { saveTopicHistory } from "../db/mutations";

export enum RoomType {
  Topic = "topic",
  Circle = "circle",
  User = "user",
}

export const ROOM_KEY_INDICATOR = "::";

export function toRoomKey({
  id,
  roomType,
}: {
  id: string;
  roomType: RoomType;
}) {
  return `${roomType}${ROOM_KEY_INDICATOR}${id}`;
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

  if (roomType === RoomType.User) {
    return socket.data.user.id === id;
  }

  return false;
}

export function handleJoinRoom({ socket, server }: HandlerArgs) {
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

      const roomKey = toRoomKey({ id, roomType });
      socket.join(roomKey);

      if (roomType === RoomType.Topic) {
        emitUserChangeInTopic({ server, socket, topicId: id });
      }

      if (roomType === RoomType.Circle) {
        emitUserJoinedCircle({ server, socket, circleId: id });
      }
    }
  );
}

export function handleLeaveRoom({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.LeaveRoom, (payload) => {
    if (!payload.id || !payload.roomType) return;

    const { id, roomType } = payload;
    const roomKey = toRoomKey({ id, roomType });

    socket.leave(roomKey);

    if (roomType === RoomType.Topic) {
      emitUserChangeInTopic({
        server,
        socket,
        topicId: id,
        recordHistory: true,
      });
    }

    if (roomType === RoomType.Circle) {
      server.to(roomKey).emit(SocketEvent.UserLeftCircle, {
        circleId: id,
      });
    }
  });
}

export async function emitUserChangeInTopic({
  server,
  socket,
  topicId,
  disconnectingUser,
  recordHistory,
}: HandlerArgs & {
  topicId: string;
  disconnectingUser?: string;
  recordHistory?: boolean;
}) {
  let hasDisconnected = false;
  const topicKey = toRoomKey({ id: topicId, roomType: RoomType.Topic });
  const sockets = await server.in(topicKey).fetchSockets();

  const activeUsers = sockets
    .map(({ data }) => data.user)
    .filter((user) => {
      if (
        disconnectingUser &&
        disconnectingUser === user.id &&
        !hasDisconnected
      ) {
        hasDisconnected = true;
        return false;
      }

      return true;
    });

  const parentCircle = await getParentCircleIdForTopic({ topicId });

  if (parentCircle) {
    const circleKey = toRoomKey({
      id: parentCircle.id,
      roomType: RoomType.Circle,
    });

    server.to(circleKey).emit(SocketEvent.UserJoinedOrLeftTopic, {
      circleId: parentCircle.id,
      topicId,
      activeUsers,
    });
  }

  if (recordHistory) {
    await saveTopicHistory({ userId: socket.data.user.id, topicId });
  }
}

export async function emitUserJoinedCircle({
  server,
  socket,
  circleId,
}: HandlerArgs & { circleId: string }) {
  const topicMap = {};
  const topicsInCircle = await getTopicIdsForCircle({ circleId });
  const userId = socket.data.user.id;

  await Promise.all(
    topicsInCircle.map(async ({ id }) => {
      const topicKey = toRoomKey({ id, roomType: RoomType.Topic });
      const socketsInTopic = await server.in(topicKey).fetchSockets();
      const activeUsers = socketsInTopic.map(({ data }) => ({
        ...data.user,
        circleId,
      }));

      topicMap[id] = {
        activeUsers,
        circleId,
      };
    })
  );

  // Gives the joining user the state of all the topics within the circle
  const userKey = toRoomKey({ id: userId, roomType: RoomType.User });
  server.to(userKey).emit(SocketEvent.UserJoinedCircle, { topicMap });
}
