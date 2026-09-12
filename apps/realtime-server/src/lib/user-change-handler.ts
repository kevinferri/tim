import { Socket } from "socket.io";

export type ActiveUserState = {
  isIdle: boolean;
  isTyping: boolean;
};

export function getInitialActiveUserState(): ActiveUserState {
  return {
    isIdle: false,
    isTyping: false,
  };
}

export function handleActiveUserStateChange(
  socket: Socket,
  next: Partial<ActiveUserState>,
) {
  const cur = socket.data.user.state;

  socket.data.user.state = {
    ...cur,
    ...next,
  };

  return socket.data.user.state;
}

export function handleActiveUserAttributeChange(
  socket: Socket,
  next: Record<string, unknown>,
) {
  const cur = socket.data.user;

  socket.data.user = {
    ...cur,
    ...next,
  };

  return socket.data.user;
}
