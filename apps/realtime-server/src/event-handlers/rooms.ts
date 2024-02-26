import { EventName, HandlerArgs } from "./main";

export function handleJoinRoom({ socket }: HandlerArgs) {
  socket.on(EventName.JoinRoom, (payload) => {
    if (!payload.topicId) return;

    console.log("someone joined.");

    socket.join(payload.topicId);
  });
}

export function handleLeaveRoom({ socket }: HandlerArgs) {
  socket.on("leave room", (payload) => {
    if (!payload.topicId) return;

    console.log("someone left.");

    socket.leave(payload.topicId);
  });
}
