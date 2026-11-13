import { ANSWERS } from "./answers";
import { VALID_GUESSES } from "./dictionary";
import { gameDayOrdinal } from "../lib/day";

// Server-only: the answer list must never reach the client bundle.
export function getAnswer(gameDate: string) {
  return ANSWERS[gameDayOrdinal(gameDate) % ANSWERS.length];
}

export function isAcceptedWord(word: string) {
  return VALID_GUESSES.has(word);
}
