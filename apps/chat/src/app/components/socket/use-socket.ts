import { useCallback, useEffect } from "react";
import { useSocketContext } from "@/components/socket/socket-provider";

export enum SocketEvent {
  SendMessage = "message:send",
  DeleteMessage = "message:delete",
  JoinRoom = "room:join",
  LeaveRoom = "room:leave",
  CreatedTopic = "topic:created",
  ToggleHighlight = "highlight:toggle",
  AddedHighlight = "highlight:added",
  RemovedHighlight = "highlight:removed",
}

export function useSocketHandler<T>(
  eventName: SocketEvent,
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

export function useSocketEmit<T>(eventName: SocketEvent) {
  const socket = useSocketContext();

  const emit = useCallback(
    (payload: T) => {
      socket.emit(eventName, payload);
    },
    [socket, eventName]
  );

  return { emit };
}
