import { HandlerArgs, SocketEvent } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";

// TODO: need to persist focused/blurred state on the server
// so when user joins they see the real state instead of everyone being focused
// maybe attach the state to socket.data and emit that when a user joins a circle/topic
function respondHandler({
  socket,
  server,
  topicId,
  event,
}: HandlerArgs & { topicId: string; event: SocketEvent }) {
  const roomKey = getRoomKeyOrFail({
    socket,
    id: topicId,
    roomType: RoomType.Topic,
  });

  if (!roomKey) return;

  server.to(roomKey).emit(event, { userId: socket.data.user.id });
}

export function handleUserTabFocused({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserTabFocused, async ({ topicId }) => {
    respondHandler({
      socket,
      server,
      topicId,
      event: SocketEvent.UserTabFocused,
    });
  });
}

export function handleUserTabBlurred({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserTabBlurred, async ({ topicId }) => {
    respondHandler({
      socket,
      server,
      topicId,
      event: SocketEvent.UserTabBlurred,
    });
  });
}

export function handleUserStartedTyping({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserStartedTyping, async ({ topicId }) => {
    respondHandler({
      socket,
      server,
      topicId,
      event: SocketEvent.UserStartedTyping,
    });
  });
}

export function handleUserStoppedTyping({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.UserStoppedTyping, async ({ topicId }) => {
    respondHandler({
      socket,
      server,
      topicId,
      event: SocketEvent.UserStoppedTyping,
    });
  });
}
