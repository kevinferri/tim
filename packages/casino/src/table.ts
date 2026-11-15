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
