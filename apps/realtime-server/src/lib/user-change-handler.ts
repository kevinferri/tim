import { ActiveUserState, AppSocket, SocketUserIdentity } from "./socket";

export type { ActiveUserState };

export function getInitialActiveUserState(): ActiveUserState {
  return {
    isIdle: false,
    isTyping: false,
  };
}

export function handleActiveUserStateChange(
  socket: AppSocket,
  next: Partial<ActiveUserState>,
) {
  socket.data.user.state = {
    ...socket.data.user.state,
    ...next,
  };

  return socket.data.user.state;
}

export function handleActiveUserAttributeChange(
  socket: AppSocket,
  next: Partial<SocketUserIdentity>,
) {
  socket.data.user = {
    ...socket.data.user,
    ...next,
  };

  return socket.data.user;
}
