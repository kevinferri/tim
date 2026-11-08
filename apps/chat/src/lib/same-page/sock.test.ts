import { describe, expect, it } from "vitest";
import { pickSockWinner } from "./sock";

describe("pickSockWinner", () => {
  it("awards the Sock when exactly one player is alone and ≥3 answered", () => {
    expect(
      pickSockWinner({ answerCount: 5, aloneUserIds: ["alone-1"] }),
    ).toBe("alone-1");
  });

  it("does not move when 2+ are alone", () => {
    expect(
      pickSockWinner({
        answerCount: 5,
        aloneUserIds: ["a", "b"],
      }),
    ).toBeNull();
  });

  it("does not move when nobody is alone", () => {
    expect(pickSockWinner({ answerCount: 4, aloneUserIds: [] })).toBeNull();
  });

  it("requires at least 3 answers (2 disagreeing both alone → no Sock)", () => {
    expect(
      pickSockWinner({ answerCount: 2, aloneUserIds: ["a", "b"] }),
    ).toBeNull();
  });
});
