import { HandlerArgs, EventName } from "./main";

export function handleChatMessage({ socket, server }: HandlerArgs) {
  socket.on(EventName.SendMessage, (payload) => {
    // This will come from db/endpoint from frontend
    const savedMessage = {
      text: payload.message,
      sentBy: socket.data.userId,
    };

    server.to(payload.topicId).emit(EventName.MessageProcessed, savedMessage);
  });
}
