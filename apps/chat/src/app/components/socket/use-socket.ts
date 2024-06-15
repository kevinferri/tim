import { useCallback, useEffect } from "react";
import { useSocketContext } from "@/components/socket/socket-provider";

export enum SocketEvent {
  SendMessage = "message:send",
  DeleteMessage = "message:delete",
  EditMessage = "message:edit",
  ShuffleGifMessage = "message:shuffleGif",

  JoinRoom = "room:join",
  LeaveRoom = "room:leave",

  UpsertedTopic = "topic:upserted",
  UserJoinedOrLeftTopic = "topic:userJoinedOrLeft",

  UpsertedCircle = "circle:upserted",
  UserJoinedCircle = "circle:userJoined",

  ToggleHighlight = "highlight:toggle",
  AddedHighlight = "highlight:added",
  RemovedHighlight = "highlight:removed",

  UserTabFocused = "user:tabFocused",
  UserTabBlurred = "user:tabBlurred",
  UserStartedTyping = "user:startedTyping",
  UserStoppedTyping = "user:stoppedTyping",
  UserExpandedImage = "user:expandedImage",

  CreateNotification = "notification:create",
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
