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

export type TableWatchPayload = TableRef;
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
export type TableClosingPayload = TableRef & { message: string };
