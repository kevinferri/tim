import { createHmac } from "node:crypto";
import { ANSWERS } from "./answers";
import { VALID_GUESSES } from "./dictionary";
import { gameDayOrdinal } from "../lib/day";

const DEV_SEED = "wordsmith-local-dev";

function getSeed() {
  const seed = process.env.WORDSMITH_SEED;
  if (seed) return seed;
  if (process.env.NODE_ENV === "production") {
    throw new Error("WORDSMITH_SEED is not set");
  }
  return DEV_SEED;
}

let answerOrder: string[] | null = null;

function getAnswerOrder() {
  if (!answerOrder) {
    const seed = getSeed();
    const key = (word: string) =>
      createHmac("sha256", seed).update(word).digest("hex");
    answerOrder = ANSWERS.map((word) => ({ word, key: key(word) }))
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map((a) => a.word);
  }
  return answerOrder;
}

// Server-only: the answer order must never reach the client bundle.
export function getAnswer(gameDate: string) {
  const order = getAnswerOrder();
  return order[gameDayOrdinal(gameDate) % order.length];
}

export function isAcceptedWord(word: string) {
  return VALID_GUESSES.has(word);
}
