import { Server, Socket } from "socket.io";
import { CommandName, parseCommand } from "@tim/commands";
import { RoomType, toRoomKey } from "../event-handlers/rooms";
import { getRandomGif, getYoutubeVideo } from "./media-fetchers";
import { getChatGpt } from "./open-ai";

type MessagePayload = {
  circleId: string;
  topicId: string;
  message: string;
  mediaUrl?: string;
};

type CommandContext = {
  socket: Socket;
  server: Server;
  payload: MessagePayload;
};

type CommandExecutor = (
  prompt: string,
  context: CommandContext
) => Promise<string | undefined>;

// "an" before a number spoken with a leading vowel sound (eight, eleven,
// eighteen, eighty-*) -- the only such leading words a die roll can produce.
function articleFor(n: number): "a" | "an" {
  if (n === 8 || n === 11 || n === 18 || (n >= 80 && n < 90)) return "an";
  return "a";
}

// Defaults to a d6; "/roll 20" or "/roll d20" (D&D notation) both roll
// 1-20. Anything else non-numeric (or <= 0) falls back to a d6 rather than
// erroring on a malformed prompt.
function rollDice(prompt: string): string {
  const sidesText = prompt.trim().replace(/^d/i, "");
  const requestedSides = parseInt(sidesText, 10);
  const sides =
    Number.isInteger(requestedSides) && requestedSides > 0
      ? requestedSides
      : 6;
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

const commandExecutors: Record<CommandName, CommandExecutor> = {
  [CommandName.Giphy]: async (prompt) => getRandomGif(prompt),
  [CommandName.Youtube]: async (prompt) => getYoutubeVideo(prompt),
  [CommandName.Roll]: async (prompt) => rollDice(prompt),
  [CommandName.EightBall]: async () => eightBall(),
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

// Parses a message's leading `/command` (if any) and runs its executor,
// returning the resulting mediaUrl -- or undefined if the message isn't a
// recognized command.
export async function executeCommand(
  text: string,
  context: CommandContext
): Promise<string | undefined> {
  const command = parseCommand(text);
  if (!command) return undefined;

  return commandExecutors[command.name](command.prompt, context);
}
