"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { NewsItemsCreatedPayload } from "@tim/news";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useSocketContext } from "@/components/socket/socket-provider";
import {
  fetchNews,
  newestCreatedAt,
  newsQueryKey,
  prependNewsItems,
} from "./news-api";
import { useNewsSeen, useNewsStore } from "./news-store";

export function useNewsFeed(circleId: string, feedId: string | null = null) {
  return useInfiniteQuery({
    queryKey: newsQueryKey(circleId, feedId),
    queryFn: ({ pageParam }) =>
      fetchNews({ circleId, feedId, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
  });
}

/** True when the circle has items newer than the newest one the viewer has seen. */
export function useHasUnreadNews(circleId: string) {
  const { data } = useNewsFeed(circleId);
  const seen = useNewsSeen(circleId);
  // The server never has the feed or what this browser has seen, so render no dot until hydrated.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const newest = newestCreatedAt(data?.pages[0]?.items);
  return hydrated && Boolean(newest && (!seen || newest > seen));
}

const noopSubscribe = () => () => {};

/** Mount once per circle page: routes live items into the cache, or holds them while the panel is open. */
export function useNewsLiveUpdates(circleId: string) {
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();

  // Items pushed while the socket was down never arrive, so catch up on every (re)connect.
  useEffect(() => {
    const onConnect = () =>
      void queryClient.invalidateQueries({ queryKey: ["news", circleId] });
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket, queryClient, circleId]);

  useSocketHandler<NewsItemsCreatedPayload>(
    SocketEvent.NewsItemsCreated,
    (payload) => {
      if (payload.circleId !== circleId || payload.items.length === 0) return;
      if (useNewsStore.getState().open) {
        useNewsStore.getState().addPending(circleId, payload.items);
      } else {
        prependNewsItems(queryClient, circleId, payload.items);
      }
    },
  );

  useSocketHandler<{ circleId?: string }>(
    SocketEvent.NewsSourcesChanged,
    (payload) => {
      if (payload.circleId !== circleId) return;
      void queryClient.invalidateQueries({ queryKey: ["news", circleId] });
    },
  );
}
