export enum SocketEvent {
  // socket.io internals (server-only)
  Connection = "connection",
  Disconnect = "disconnect",
  Disconnecting = "disconnecting",

  // messages
  SendMessage = "message:send",
  DeleteMessage = "message:delete",
  EditMessage = "message:edit",
  ShuffleGifMessage = "message:shuffleGif",

  // rooms
  JoinRoom = "room:join",
  LeaveRoom = "room:leave",

  // topics
  UpsertedTopic = "topic:upserted",
  DeletedTopic = "topic:deleted",
  UserJoinedOrLeftTopic = "topic:userJoinedOrLeft",

  // circles
  UpsertedCircle = "circle:upserted",
  DeletedCircle = "circle:deleted",
  UserJoinedCircle = "circle:userJoined",
  UserLeftCircle = "circle:userLeft",

  // highlights
  ToggleHighlight = "highlight:toggle",
  AddedHighlight = "highlight:added",
  RemovedHighlight = "highlight:removed",

  // user activity
  UserTabFocused = "user:tabFocused",
  UserTabBlurred = "user:tabBlurred",
  UserStartedTyping = "user:startedTyping",
  UserStoppedTyping = "user:stoppedTyping",
  UserExpandedImage = "user:expandedImage",
  UserClickedLink = "user:clickedLink",
  UserUpdatedStatus = "user:updatedStatus",
  UserUpdatedProfile = "user:updatedProfile",

  // notifications
  CreateNotification = "notification:create",

  // Same Page game alerts (circle-scoped; not tied to a chat message)
  SamePageAlert = "samepage:alert",
}

// Carried in JoinRoom/LeaveRoom payloads -- shared here so both sides use the exact same values.
export enum RoomType {
  Topic = "topic",
  Circle = "circle",
  User = "user",
}

// Carried in a CreateNotification payload's `notificationType` field -- shared here since each side previously kept its own hand-copied enum that had drifted out of sync.
export enum NotificationType {
  HighlightRecieved = "highlight:recieved",
  HighlightRemoved = "highlight:removed",
  ExpandedImage = "image:expanded",
  ClickedLink = "link:clicked",
  Mentioned = "mention:received",
  Replied = "reply:received",
  SamePagePrompt = "samepage:prompt",
  SamePageNudge = "samepage:nudge",
  SamePageReveal = "samepage:reveal",
}

export type SamePageAlertKind = "prompt" | "nudge" | "reveal";

export type SamePageAlertPayload = {
  circleId: string;
  kind: SamePageAlertKind;
  gameDate: string;
  prompt?: string;
};
