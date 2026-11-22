import { SocketEvent, HandlerArgs } from "./main";
import { RoomType, registerRoomEvent } from "./rooms";
import { getParentCircleIdForTopic } from "../db/topics";

export type NewsRefresher = {
  refreshCircle: (circleId: string) => Promise<void>;
};

export function handleNews(
  { socket, server }: HandlerArgs,
  news: NewsRefresher | undefined,
) {
  // Relays a content-free "refetch your news" ping to the circle's other sockets after the chat app changes its sources or News setting.
  registerRoomEvent<{ circleId?: unknown } | undefined>({
    socket,
    server,
    event: SocketEvent.NewsSourcesChanged,
    roomType: RoomType.Circle,
    getId: (payload) =>
      typeof payload?.circleId === "string" ? payload.circleId : "",
    handler: ({ socket, roomKey, payload }) => {
      socket.to(roomKey).emit(SocketEvent.NewsSourcesChanged, {
        circleId: payload!.circleId,
      });
    },
  });

  registerRoomEvent<{ circleId?: unknown } | undefined>({
    socket,
    server,
    event: SocketEvent.NewsRefresh,
    roomType: RoomType.Circle,
    getId: (payload) =>
      typeof payload?.circleId === "string" ? payload.circleId : "",
    handler: ({ payload }) => {
      void news?.refreshCircle(payload!.circleId as string);
    },
  });
}

/** Opening a topic counts as opening its circle, which refreshes the circle's news. */
export async function refreshNewsForTopic(
  news: NewsRefresher | undefined,
  topicId: string,
) {
  if (!news) return;
  const circle = await getParentCircleIdForTopic({ topicId });
  if (circle) void news.refreshCircle(circle.id);
}
