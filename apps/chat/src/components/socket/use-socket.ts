"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSocketContext } from "@/components/socket/socket-provider";

export enum SocketEvent {
  SendMessage = "message:send",
  DeleteMessage = "message:delete",
  EditMessage = "message:edit",
  ShuffleGifMessage = "message:shuffleGif",

  JoinRoom = "room:join",
  LeaveRoom = "room:leave",

  UpsertedTopic = "topic:upserted",
  DeletedTopic = "topic:deleted",
  UserJoinedOrLeftTopic = "topic:userJoinedOrLeft",

  UpsertedCircle = "circle:upserted",
  DeletedCircle = "circle:deleted",
  UserJoinedCircle = "circle:userJoined",

  ToggleHighlight = "highlight:toggle",
  AddedHighlight = "highlight:added",
  RemovedHighlight = "highlight:removed",

  UserTabFocused = "user:tabFocused",
  UserTabBlurred = "user:tabBlurred",
  UserStartedTyping = "user:startedTyping",
  UserStoppedTyping = "user:stoppedTyping",
  UserExpandedImage = "user:expandedImage",
  UserClickedLink = "user:clickedLink",
  CreateNotification = "notification:create",
  UpdateUserStatus = "user:updatedStatus",
}

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
