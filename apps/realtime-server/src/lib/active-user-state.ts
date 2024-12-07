import { Socket } from "socket.io";

export type ActiveUserState = {
  isIdle: boolean;
  isTyping: boolean;
};

export function handleActiveUserStateChange(
  socket: Socket,
  next: Partial<ActiveUserState>
) {
  const cur = socket.data.user.state;

  socket.data.user.state = {
    ...cur,
    ...next,
  };

  return socket.data.user.state;
}
