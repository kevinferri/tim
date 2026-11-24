import { describe, expect, it } from "vitest";
import { blackjackTablePath, parseBlackjackTablePath } from "./table-link";

describe("parseBlackjackTablePath", () => {
  it("round-trips with blackjackTablePath", () => {
    expect(parseBlackjackTablePath(blackjackTablePath("c 1"))).toEqual({
      circleId: "c 1",
    });
  });

  it("ignores anything else, like the /blackjack command's reply", () => {
    for (const value of [
      "🃏 Type /blackjack to open Blackjack.",
      "/circles/c1/topics/t1",
      "/circles/c1/casino/poker",
      "/circles/c1/casino/blackjack/extra",
      "https://evil.example/circles/c1/casino/blackjack",
    ]) {
      expect(parseBlackjackTablePath(value)).toBeNull();
    }
  });
});
