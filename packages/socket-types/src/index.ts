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
  // Content-free "refetch your notifications" ping for a circle's other members, sent by the browser after the chat app saves circle notifications.
  CircleNotificationsChanged = "notification:circleChanged",

  // news: the realtime server pushes ItemsCreated to each following circle's room as feeds update; SourcesChanged is a content-free refetch ping the browser sends after the chat app adds or removes a source or turns News on or off
  NewsItemsCreated = "news:itemsCreated",
  NewsSourcesChanged = "news:sourcesChanged",

  // casino (payload types live in @tim/casino)
  TableWatch = "table:watch",
  TableUnwatch = "table:unwatch",
  TableSit = "table:sit",
  TableStand = "table:stand",
  TableAction = "table:action",
  TableState = "table:state",
  TableError = "table:error",
  TableClosing = "table:closing",
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
  SamePageAnswered = "samepage:answered",
  WordsmithFinished = "wordsmith:finished",
}
