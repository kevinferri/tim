import { describe, expect, it } from "vitest";
import { isWellFormedGuess, normalizeGuess, scoreGuess } from "./rules";

const s = (guess: string, answer: string) =>
  scoreGuess(guess, answer)
    .map((x) => ({ hit: "H", near: "N", miss: "." })[x])
    .join("");

describe("scoreGuess", () => {
  it.each([
    ["exact match", "crane", "crane", "HHHHH"],
    ["no shared letters", "bumpy", "crane", "....."],
    ["letters out of place", "nacre", "crane", "NNNNH"],
    // A repeated guess letter beyond the answer's count is a miss.
    ["extra repeat is a miss", "geese", "these", "..HHH"],
    ["repeat: both copies near when answer has two", "llama", "hello", "NN..."],
    ["repeat: hits use up the answer's copies", "lolly", "hello", ".NHH."],
    ["repeat in answer, single in guess", "piano", "hello", "....H"],
  ])("%s (%s vs %s)", (_label, guess, answer, expected) => {
    expect(s(guess, answer)).toBe(expected);
  });
});

describe("guess validation", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeGuess("  CrAnE ")).toBe("crane");
  });
  it.each(["cran", "cranes", "cr4ne", "cr ne", ""])("rejects %j", (g) => {
    expect(isWellFormedGuess(g)).toBe(false);
  });
});
