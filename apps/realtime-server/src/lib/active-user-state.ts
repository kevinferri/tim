import { Socket } from "socket.io";

// TODO: consider using Redis to manage this if we ever need to.
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
  next: Partial<ActiveUserState>
) {
  const cur = socket.data.user.state;

  socket.data.user.state = {
    ...cur,
    ...next,
  };

  return socket.data.user.state;
}
