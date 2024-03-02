import { useCallback, useEffect } from "react";
import { useSocketContext } from "./socket-provider";
import { useRouter } from "next/navigation";

export enum HandlerEvent {
  MessageProcessed = "message processed",
}

export enum EmitEvent {
  SendMessage = "send message",
  JoinRoom = "join room",
  LeaveRoom = "leave room",
}

export function useSocketHandler<T>(
  eventName: HandlerEvent,
  handler: (args: T) => void
) {
  const socket = useSocketContext();

  useEffect(() => {
    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
    };
  }, [eventName, handler, socket]);

  return socket;
}

export function useSocketEmit<T>(eventName: EmitEvent) {
  const socket = useSocketContext();

  const emit = useCallback(
    (payload: T) => {
      socket.emit(eventName, payload);
    },
    [socket, eventName]
  );

  return { emit };
}
