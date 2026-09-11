// Canonical slash-command names. This is the single source of truth for
// what commands exist -- apps/realtime-server dispatches on these, and
// apps/chat uses them to drive UI (loading state, edit/shuffle gating,
// command-token styling) without hand-rolling its own command list that can
// drift out of sync with what the server actually supports.
export enum CommandName {
  Giphy = "giphy",
  Youtube = "youtube",
  Tim = "tim",
  Roll = "roll",
  EightBall = "8ball",
}

// Every token a user can type after "/", mapped to the canonical command it
// resolves to. Add aliases here (not in either app) the same way new socket
// events are added to @tim/socket-types first.
export const COMMAND_ALIASES: Record<string, CommandName> = {
  giphy: CommandName.Giphy,
  gif: CommandName.Giphy,
  youtube: CommandName.Youtube,
  yt: CommandName.Youtube,
  tim: CommandName.Tim,
  roll: CommandName.Roll,
  "8ball": CommandName.EightBall,
};

export type ParsedCommand = {
  name: CommandName;
  token: string;
  prompt: string;
};

export function parseCommand(text: string): ParsedCommand | undefined {
  const words = text.split(" ");
  const firstWord = words[0] ?? "";
  if (!firstWord.startsWith("/")) return undefined;

  const token = firstWord.slice(1).toLowerCase();
  const name = COMMAND_ALIASES[token];
  if (!name) return undefined;

  return { name, token, prompt: words.slice(1).join(" ") };
}

export function isCommandMessage(text: string): boolean {
  return parseCommand(text) !== undefined;
}

export type CommandInfo = {
  name: CommandName;
  tokens: string[];
  description: string;
  usage: string;
};

const COMMAND_DESCRIPTIONS: Record<CommandName, string> = {
  [CommandName.Tim]: "Ask Tim, the AI assistant",
  [CommandName.Giphy]: "Send a random gif",
  [CommandName.Youtube]: "Share a YouTube video",
  [CommandName.Roll]: "Roll a die",
  [CommandName.EightBall]: "Ask the magic 8-ball a question",
};

// A worked example of the command's argument shape, shown alongside its
// description in the autocomplete -- separate from COMMAND_DESCRIPTIONS so
// examples don't have to be crammed into prose (as /roll's description used
// to do).
const COMMAND_USAGE: Record<CommandName, string> = {
  [CommandName.Tim]: "/tim summarize the chat",
  [CommandName.Giphy]: "/giphy rise and grind",
  [CommandName.Youtube]: "/youtube never gonna give you up",
  [CommandName.Roll]: "/roll d20",
  [CommandName.EightBall]: "/8ball will it rain tomorrow?",
};

// Display order for command UI (e.g. chat's "/" autocomplete): alphabetical
// by name, computed rather than hand-listed so a newly added CommandName
// sorts itself in instead of needing the order updated separately. Tokens
// are grouped from COMMAND_ALIASES rather than re-listed here, so this
// can't drift from what's actually dispatchable.
const COMMAND_ORDER: CommandName[] = Object.values(CommandName).sort();

export const COMMANDS: CommandInfo[] = COMMAND_ORDER.map((name) => ({
  name,
  tokens: Object.keys(COMMAND_ALIASES).filter(
    (token) => COMMAND_ALIASES[token] === name,
  ),
  description: COMMAND_DESCRIPTIONS[name],
  usage: COMMAND_USAGE[name],
}));
