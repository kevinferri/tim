export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** hit = right letter, right spot; near = in the word elsewhere; miss = not in the word. */
export type LetterScore = "hit" | "near" | "miss";

export function normalizeGuess(raw: string) {
  return raw.trim().toLowerCase();
}

export function isWellFormedGuess(guess: string) {
  return new RegExp(`^[a-z]{${WORD_LENGTH}}$`).test(guess);
}

/** Repeated letters only score "near" as many times as the answer still has them unmatched. */
export function scoreGuess(guess: string, answer: string): LetterScore[] {
  const scores: LetterScore[] = Array(guess.length).fill("miss");
  const unmatched = new Map<string, number>();

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) scores[i] = "hit";
    else unmatched.set(answer[i], (unmatched.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (scores[i] === "hit") continue;
    const left = unmatched.get(guess[i]) ?? 0;
    if (left > 0) {
      scores[i] = "near";
      unmatched.set(guess[i], left - 1);
    }
  }
  return scores;
}

export function isFinished(guessCount: number, solved: boolean) {
  return solved || guessCount >= MAX_GUESSES;
}
