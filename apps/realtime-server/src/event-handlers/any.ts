import { HandlerArgs } from "./main";

const debug = process.env.DEBUG === "true";

function toLogPaylod(eventName: string, args: unknown[], userId: string) {
  return {
    eventName,
    args: args[0],
    userId,
  };
}

export function handleOnAny({ socket }: HandlerArgs) {
  if (debug) {
    socket.onAny((event, ...args) => {
      console.log("incoming: ", toLogPaylod(event, args, socket.data.user.id));
    });
  }
}

export function handleOnAnyOutgoing({ socket }: HandlerArgs) {
  if (debug) {
    socket.onAnyOutgoing((event, ...args) => {
      console.log("outgoing: ", toLogPaylod(event, args, socket.data.user.id));
    });
  }
}
