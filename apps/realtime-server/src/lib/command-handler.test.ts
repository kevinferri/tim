import { describe, it, expect, vi } from "vitest";
import { CommandName, COMMANDS, COMMAND_ALIASES } from "@tim/commands";
import { executeCommand } from "./command-handler";
import * as mediaFetchers from "./media-fetchers";

describe("executeCommand", () => {
  it("dispatches to the matching command and resolves aliases", async () => {
    vi.spyOn(mediaFetchers, "getRandomGif").mockResolvedValue("gif-url");

    const result = await executeCommand("/gif cat riding a skateboard", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(mediaFetchers.getRandomGif).toHaveBeenCalledWith(
      "cat riding a skateboard",
    );
    expect(result).toBe("gif-url");
  });

  it("lowercases the command token", async () => {
    vi.spyOn(mediaFetchers, "getYoutubeVideo").mockResolvedValue("youtube-url");

    const result = await executeCommand("/YT never gonna give you up", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(result).toBe("youtube-url");
  });

  it("returns undefined for a non-command message", async () => {
    const result = await executeCommand("just chatting", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined for an unrecognized command", async () => {
    const result = await executeCommand("/notacommand hello", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(result).toBeUndefined();
  });
});

describe("executeCommand roll", () => {
  it("rolls a d6 by default", async () => {
    const result = await executeCommand("/roll", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(result).toMatch(/^🎲 rolled a [1-6]$/);
  });

  it("rolls within the requested number of sides", async () => {
    const result = await executeCommand("/roll 20", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(result).toMatch(/^🎲 rolled (a|an) (\d|1\d|20)$/);
  });

  it("accepts D&D-style 'dN' notation", async () => {
    const result = await executeCommand("/roll d20", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(result).toMatch(/^🎲 rolled (a|an) (\d|1\d|20)$/);
  });

  it("falls back to a d6 for a non-numeric or non-positive prompt", async () => {
    const result = await executeCommand("/roll banana", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(result).toMatch(/^🎲 rolled a [1-6]$/);
  });

  it("uses 'an' before 8, 11, 18, and 80-89", async () => {
    const randomSpy = vi.spyOn(Math, "random");

    randomSpy.mockReturnValueOnce(7 / 20); // floor(7) + 1 = 8, sides = 20
    expect(
      await executeCommand("/roll 20", {
        socket: {} as any,
        server: {} as any,
        payload: {} as any,
      }),
    ).toBe("🎲 rolled an 8");

    randomSpy.mockReturnValueOnce(10 / 20); // floor(10) + 1 = 11, sides = 20
    expect(
      await executeCommand("/roll 20", {
        socket: {} as any,
        server: {} as any,
        payload: {} as any,
      }),
    ).toBe("🎲 rolled an 11");

    randomSpy.mockReturnValueOnce(17 / 20); // floor(17) + 1 = 18, sides = 20
    expect(
      await executeCommand("/roll 20", {
        socket: {} as any,
        server: {} as any,
        payload: {} as any,
      }),
    ).toBe("🎲 rolled an 18");

    randomSpy.mockReturnValueOnce(84 / 100); // floor(84) + 1 = 85, sides = 100
    expect(
      await executeCommand("/roll 100", {
        socket: {} as any,
        server: {} as any,
        payload: {} as any,
      }),
    ).toBe("🎲 rolled an 85");

    randomSpy.mockRestore();
  });
});

describe("executeCommand 8ball", () => {
  it("returns one of the fixed magic 8-ball answers", async () => {
    const result = await executeCommand("/8ball will it rain tomorrow?", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(result).toMatch(/^🎱 .+$/);
  });

  it("ignores the prompt and still resolves", async () => {
    const result = await executeCommand("/8ball", {
      socket: {} as any,
      server: {} as any,
      payload: {} as any,
    });

    expect(result).toMatch(/^🎱 .+$/);
  });
});

describe("CommandName", () => {
  it("covers giphy, youtube, tim, roll, and 8ball", () => {
    expect(Object.values(CommandName).sort()).toEqual(
      ["8ball", "giphy", "roll", "tim", "youtube"].sort(),
    );
  });
});

describe("COMMANDS", () => {
  it("lists every command exactly once, matching the alias map", () => {
    expect(COMMANDS.map((c) => c.name).sort()).toEqual(
      Object.values(CommandName).sort(),
    );

    for (const command of COMMANDS) {
      expect(command.tokens.length).toBeGreaterThan(0);
      expect(command.description.length).toBeGreaterThan(0);
      expect(command.usage.length).toBeGreaterThan(0);

      for (const token of command.tokens) {
        expect(COMMAND_ALIASES[token]).toBe(command.name);
      }
    }
  });
});
