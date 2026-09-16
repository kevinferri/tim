import { DefaultEventsMap, Server, Socket } from "socket.io";

// Mirrors the fields the chat app signs into the socket JWT (see
// apps/chat/src/app/layout.tsx's getSocketConfig/getLoggedInUser select).
// Don't widen this by importing Prisma's User type from @tim/db-types --
// createdAt/lastStatusUpdate are typed there as Date, but a JWT payload is
// JSON, so by the time jwt.verify() decodes it here they're ISO strings.
export type SocketUserIdentity = {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  status: string | null;
  lastStatusUpdate: string | null;
  createdAt: string;
};

export type ActiveUserState = {
  isIdle: boolean;
  isTyping: boolean;
};

export type SocketUser = SocketUserIdentity & { state: ActiveUserState };

export type SocketData = {
  user: SocketUser;
};

export type AppServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

export type AppSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;
