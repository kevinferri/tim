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

const TABLE_GAME_NAMES: Record<TableGame, string> = { blackjack: "Blackjack" };
export const tableGameName = (game: TableGame) => TABLE_GAME_NAMES[game];

/** The status a seated player shows. The text spade, not the emoji: it takes the status text's color. */
export const casinoStatus = (game: TableGame) =>
  `♠ At the casino playing ${tableGameName(game)}`;
