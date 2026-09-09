"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSocketContext } from "@/components/socket/socket-provider";
import { SocketEvent } from "@tim/shared-types";

export { SocketEvent };

export function useSocketHandler<T>(
  eventName: SocketEvent,
  handler: (args: T) => void,
  skip = false
) {
  const { socket } = useSocketContext();
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (skip) return;

    const listener = (args: T) => savedHandler.current(args);
    socket.on(eventName, listener);

    return () => {
      socket.off(eventName, listener);
    };
  }, [eventName, skip, socket]);

  return socket;
}

export function useSocketEmit<T>(eventName: SocketEvent) {
  const { socket } = useSocketContext();

  const emit = useCallback(
    (payload: T) => {
      socket.emit(eventName, payload);
    },
    [eventName, socket]
  );

  return { emit };
}
