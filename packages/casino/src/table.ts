export const SEAT_COUNT = 9;

export type TableGame = "blackjack";

export type SeatOccupant = {
  userId: string;
  name: string | null;
  displayName: string;
  imageUrl: string | null;
  // ISO string: occupants come from the socket JWT and travel as JSON.
  createdAt: string;
};

export type TableRef = { circleId: string; game: TableGame };

/** `spectate`: see who's seated without playing; a spectator can't sit and doesn't keep a player seated. */
export type TableWatchPayload = TableRef & { spectate?: boolean };
export type TableUnwatchPayload = TableRef;
/** Omit `seat` to take the free seat closest to the middle of the table. */
export type TableSitPayload = TableRef & { seat?: number };
export type TableStandPayload = TableRef;
/** Errors the page handles itself instead of showing the message. */
export type TableErrorCode = "game_off";
/** Sent to one socket when its request was rejected. */
export type TableErrorPayload = TableRef & {
  message: string;
  code?: TableErrorCode;
};
/** Sent to every watcher when the server shuts down mid-game. */
/** The table is closing for a restart; the client says so on the felt, and works out any refund from its last snapshot. */
export type TableClosingPayload = TableRef;

/** Table chat: quick remarks while playing. What people say is saved for 24 hours. */
export const TABLE_CHAT_MAX_LENGTH = 200;
/** How many of the last 24 hours' lines a newcomer gets on watch. */
export const TABLE_CHAT_KEPT = 50;
/** Something a player said. */
export type TableChatSay = {
  id: string;
  kind: "say";
  userId: string;
  name: string | null;
  displayName: string;
  imageUrl: string | null;
  text: string;
};
/** Who a table event is about, with what their avatar needs. */
export type TableChatPerson = Pick<
  SeatOccupant,
  "userId" | "name" | "displayName" | "imageUrl"
>;
/** Posted by the table itself when someone sits down or stands up. Live only: never saved. */
export type TableChatEvent = {
  id: string;
  kind: "joined" | "left";
} & TableChatPerson;
export type TableChatLine = TableChatSay | TableChatEvent;
export type TableChatSendPayload = TableRef & { text: string };
/** `recent`: what was said in the last 24 hours, sent on watch, replacing any lines the client has; otherwise one new line. */
export type TableChatPayload = TableRef &
  ({ recent: TableChatSay[] } | { line: TableChatLine });
