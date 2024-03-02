import { EventName, HandlerArgs } from "./main";

export function handleClientConnected({ server }: HandlerArgs) {
  console.log(`📈 clients: ${server.engine.clientsCount}`);
}

export function handleClientDisconnected({ socket, server }: HandlerArgs) {
  socket.on(EventName.Disconnect, () => {
    console.log(`📉 clients: ${server.engine.clientsCount}`);
  });
}
