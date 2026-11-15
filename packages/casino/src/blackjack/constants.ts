export const MIN_BET = 10;
export const MAX_BET = 500;
export const STARTING_CHIPS = 1000;
export const BETTING_WINDOW_MS = 10_000;
export const TURN_MS = 20_000;

export const SHOE_DECKS = 6;
/** Reshuffle before a round when fewer than 25% of the shoe remains. */
export const RESHUFFLE_BELOW = (SHOE_DECKS * 52) / 4;
