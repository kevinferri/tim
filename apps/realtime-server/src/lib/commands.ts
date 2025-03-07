import { Server, Socket } from "socket.io";
import { RoomType, toRoomKey } from "../event-handlers/rooms";
import { getRandomGif, getYoutubeVideo } from "./media-fetchers";
import { getChatGpt } from "./open-ai";

type Command = {
  execute: (prompt: string, context: CommandContext) => Promise<string | null>;
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
