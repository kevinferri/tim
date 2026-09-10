import { describe, it, expect } from "vitest";
import {
  getCommandTokens,
  findCommandKeyByExecute,
  commandRegistry,
} from "./command-handler";

describe("getCommandTokens", () => {
  it("splits the command name from the remaining prompt", () => {
    expect(getCommandTokens("/giphy cat riding a skateboard")).toEqual({
      words: ["/giphy", "cat", "riding", "a", "skateboard"],
      commandType: "giphy",
      commandPrompt: "cat riding a skateboard",
    });
  });

  it("lowercases the command name", () => {
    const { commandType } = getCommandTokens("/YT never gonna give you up");
    expect(commandType).toBe("yt");
  });

  it("returns an empty prompt for a bare command", () => {
    const { commandPrompt } = getCommandTokens("/giphy");
    expect(commandPrompt).toBe("");
  });
});

describe("findCommandKeyByExecute", () => {
  it("finds the registry key for a command's execute function", () => {
    expect(findCommandKeyByExecute(commandRegistry.giphy)).toBe("giphy");
    expect(findCommandKeyByExecute(commandRegistry.tim)).toBe("tim");
  });
});

describe("commandRegistry", () => {
  it("registers the expected command aliases", () => {
    expect(Object.keys(commandRegistry).sort()).toEqual(
      ["giph", "giphy", "tim", "yt", "youtube"].sort()
    );
  });
});
