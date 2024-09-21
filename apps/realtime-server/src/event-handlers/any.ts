import { HandlerArgs } from "./main";

function toLogPaylod(eventName: string, args: unknown[], userId: string) {
  return {
    eventName,
    args: args[0],
    userId,
  };
}

export function handleOnAny({ socket }: HandlerArgs) {
  socket.onAny((event, ...args) => {
    //console.log("incoming: ", toLogPaylod(event, args, socket.data.user.id));
  });
}

export function handleOnAnyOutgoing({ socket }: HandlerArgs) {
  socket.onAnyOutgoing((event, ...args) => {
    //console.log("outgoing: ", toLogPaylod(event, args, socket.data.user.id));
  });
}
