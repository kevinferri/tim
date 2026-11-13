import {
  CommandName,
  parseCommand,
  parseSamePageSubcommand,
} from "@tim/commands";
import { RoomType, toRoomKey } from "../event-handlers/rooms";
import { getSamePageSockHolder } from "../db/same-page";
import { getRandomGif, getYoutubeVideo } from "./media-fetchers";
import { getChatGpt } from "./open-ai";
import { AppServer, AppSocket } from "./socket";

type MessagePayload = {
  circleId: string;
  topicId: string;
  message: string;
  mediaUrl?: string;
};

type CommandContext = {
  socket: AppSocket;
  server: AppServer;
  payload: MessagePayload;
};

type CommandExecutor = (
  prompt: string,
  context: CommandContext,
) => Promise<string | undefined>;

// "an" before a number spoken with a leading vowel sound (eight, eleven,
// eighteen, eighty-*) -- the only such leading words a die roll can produce.
function articleFor(n: number): "a" | "an" {
  if (n === 8 || n === 11 || n === 18 || (n >= 80 && n < 90)) return "an";
  return "a";
}

// Falls back to a d6 for anything non-numeric (or <= 0) rather than erroring on a malformed prompt.
function rollDice(prompt: string): string {
  const sidesText = prompt.trim().replace(/^d/i, "");
  const requestedSides = parseInt(sidesText, 10);
  const sides =
    Number.isInteger(requestedSides) && requestedSides > 0 ? requestedSides : 6;
  const result = Math.floor(Math.random() * sides) + 1;

  return `🎲 rolled ${articleFor(result)} ${result}`;
}

const EIGHT_BALL_ANSWERS = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
];

function eightBall(): string {
  const answer =
    EIGHT_BALL_ANSWERS[Math.floor(Math.random() * EIGHT_BALL_ANSWERS.length)];

  return `🎱 ${answer}`;
}

async function samePageCommand(
  prompt: string,
  { payload }: CommandContext,
): Promise<string | undefined> {
  const sub = parseSamePageSubcommand(prompt);
  // play / results / standings / default are opened client-side; sock posts a card.
  if (sub !== "sock") {
    return "🧦 Open Same Page from the Game room (or /samepage play).";
  }

  const sock = await getSamePageSockHolder(payload.circleId);
  if (!sock?.holderUserId || !sock.displayName) {
    return "🧦 Nobody holds the Sock right now.";
  }

  const since = sock.heldSince
    ? ` since ${new Date(sock.heldSince).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`
    : "";
  return `🧦 ${sock.displayName} has the Sock${since}.`;
}

const commandExecutors: Record<CommandName, CommandExecutor> = {
  [CommandName.Giphy]: async (prompt) => getRandomGif(prompt),
  [CommandName.Youtube]: async (prompt) => getYoutubeVideo(prompt),
  [CommandName.Roll]: async (prompt) => rollDice(prompt),
  [CommandName.EightBall]: async () => eightBall(),
  [CommandName.SamePage]: samePageCommand,
  // Handled in the browser; this only answers a client that sends it anyway.
  [CommandName.GameRoom]: async () =>
    "🎮 Type /gameroom to open the Game room.",
  [CommandName.Wordsmith]: async () => "🪶 Type /wordsmith to open Wordsmith.",
  [CommandName.Tim]: async (prompt, { socket, server, payload }) => {
    const topicKey = toRoomKey({
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    const sockets = await server.in(topicKey).fetchSockets();
    const activeUsers = sockets.map(({ data }) => data.user);

    return getChatGpt({
      query: prompt,
      userId: socket.data.user.id,
      topicId: payload.topicId,
      circleId: payload.circleId,
      activeUsers,
    });
  },
};

export async function executeCommand(
  text: string,
  context: CommandContext,
): Promise<string | undefined> {
  const command = parseCommand(text);
  if (!command) return undefined;

  return commandExecutors[command.name](command.prompt, context);
}
