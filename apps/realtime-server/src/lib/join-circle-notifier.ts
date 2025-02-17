import { Socket, Server } from "socket.io";

type Args = {
  roomKey: string;
  server: Server;
  socket: Socket;
  circleId: string;
};

// export async function handleJoinCircleNotify({
//   socket,
//   roomKey,
//   server,
//   circleId,
// }: Args) {
//   const sockets = await server.in(roomKey).fetchSockets();
//   const activeUsers = sockets
//     .map(({ data }) => data.user)
//     .filter(({ id }) => id !== socket.data.user.id);
// }
