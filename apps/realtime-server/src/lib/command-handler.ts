import { Server, Socket } from "socket.io";
import { RoomType, toRoomKey } from "../event-handlers/rooms";
import { getRandomGif, getYoutubeVideo } from "./media-fetchers";
import { getChatGpt } from "./open-ai";

type Command = {
  execute: (
    prompt: string,
    context: CommandContext
  ) => Promise<string | undefined>;
};

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

export const commandRegistry: Record<string, Command> = {
  giphy: {
    execute: async (prompt) => getRandomGif(prompt),
  },
  giph: {
    execute: async (prompt) => getRandomGif(prompt),
  },
  youtube: {
    execute: async (prompt) => getYoutubeVideo(prompt),
  },
  yt: {
    execute: async (prompt) => getYoutubeVideo(prompt),
  },
  tim: {
    execute: async (prompt, { socket, server, payload }) => {
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
  },
};

export function getCommandTokens(text: string) {
  const words = text.split(" ");
  const wordsCopy = [...words];
  const commandType = words[0].substring(1, words[0].length).toLowerCase();

  wordsCopy.shift();
  const commandPrompt = wordsCopy.join(" ");

  return { words, commandType, commandPrompt };
}
