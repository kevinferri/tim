import { describe, expect, it } from "vitest";
import { parseCommand } from "@tim/commands";
import { isBareRoll } from "./message-utils";

const bare = (text: string) => isBareRoll(parseCommand(text));

describe("isBareRoll", () => {
  it("is true when the roll has nothing but an optional die", () => {
    expect(bare("/roll")).toBe(true);
    expect(bare("/roll d20")).toBe(true);
    expect(bare("/roll D6")).toBe(true);
    // Same die as d20, so the die's "d20" label says it all.
    expect(bare("/roll 20")).toBe(true);
  });

  it("keeps the text when the roll says more", () => {
    expect(bare("/roll d20 for initiative")).toBe(false);
    expect(bare("/roll for it")).toBe(false);
  });

  it("is false for other commands and plain messages", () => {
    expect(bare("/8ball d20")).toBe(false);
    expect(bare("/giphy 20")).toBe(false);
    expect(isBareRoll(undefined)).toBe(false);
  });
});
