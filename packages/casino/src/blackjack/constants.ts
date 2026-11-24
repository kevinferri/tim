// Beside a 1/3 poker cash game (300 buy-in), luck-driven blackjack moves up/down less than poker, where skill shows.
export const MIN_BET = 10;
export const MAX_BET = 100;
/** Bets come in red 5s, as on a real table; the white 1 only appears as change (an odd 3:2 rounds down). */
export const BET_UNIT = 5;
export const BETTING_WINDOW_MS = 10_000;
export const TURN_MS = 20_000;

export const SHOE_DECKS = 6;
/** Resplits allowed up to this many hands; split aces take one card each, so they never resplit. */
export const MAX_SPLIT_HANDS = 4;
/** Reshuffle before a round when fewer than 25% of the shoe remains. */
export const RESHUFFLE_BELOW = (SHOE_DECKS * 52) / 4;

/** Pause between dealer cards. */
export const DEALER_DRAW_MS = 800;
/** How long round outcomes stay up before the next betting phase. */

// Long enough for the dealer to settle seat by seat and the last seat's win to finish counting up.
export const RESULTS_MS = 4_200;
