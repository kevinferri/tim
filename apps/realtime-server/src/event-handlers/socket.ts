import { EventName, HandlerArgs } from "./main";

export function handleClientConnected({ socket, server }: HandlerArgs) {
  console.log(`➕ Clients: ${server.engine.clientsCount}`);
}

export function handleClientDisconnected({ socket, server }: HandlerArgs) {
  socket.on(EventName.Disconnect, () => {
    console.log(`➖ Clients: ${server.engine.clientsCount}`);
  });
}
