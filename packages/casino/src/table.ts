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
export type TableSitPayload = TableRef & { seat: number };
export type TableStandPayload = TableRef;
/** Sent to one socket when its request was rejected. */
export type TableErrorPayload = TableRef & { message: string };
/** Sent to every watcher when the server shuts down mid-game. */
export type TableClosingPayload = TableRef & { message: string };
