"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { NewsItemsCreatedPayload } from "@tim/news/shared";
import {
  SocketEvent,
  useSocketEmit,
  useSocketHandler,
} from "@/components/socket/use-socket";
import { useSocketContext } from "@/components/socket/socket-provider";
import { fetchNews, newsQueryKey } from "./news-api";
import { useNewsSeen } from "./news-store";

export function useNewsFeed(circleId: string, feedId: string | null = null) {
  return useInfiniteQuery({
    queryKey: newsQueryKey(circleId, feedId),
    queryFn: ({ pageParam }) =>
      fetchNews({ circleId, feedId, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
    // Pushes and reconnects refetch it; a focus refetch would also move the list under the reader.
    refetchOnWindowFocus: false,
  });
}

/** When the circle's newest story arrived (the API looks past page 1). */
export function useNewestArrival(circleId: string): string | null {
  const { data } = useNewsFeed(circleId);
  return data?.pages[0]?.newestCreatedAt ?? null;
}

/** True when a story arrived after the newest one the viewer has seen. */
export function useHasUnreadNews(circleId: string) {
  const newest = useNewestArrival(circleId);
  const seen = useNewsSeen(circleId);
  // The server never has what this browser has seen, so render no dot until hydrated.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return hydrated && Boolean(newest && (!seen || newest > seen));
}

const noopSubscribe = () => () => {};

/** Asks the realtime server to fetch the circle's feeds now; it skips any fetched in the last hour. */
export function useNewsRefresh(circleId: string) {
  const { emit } = useSocketEmit<{ circleId: string }>(SocketEvent.NewsRefresh);
  return useCallback(() => emit({ circleId }), [emit, circleId]);
}

/** Refetches the circle's news here, and tells its other members' tabs to do the same. */
export function useNewsChanged(circleId: string) {
  const queryClient = useQueryClient();
  const { emit } = useSocketEmit<{ circleId: string }>(
    SocketEvent.NewsSourcesChanged,
  );
  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["news", circleId] });
    emit({ circleId });
  }, [queryClient, emit, circleId]);
}

/** Mount once per circle page: refetches the circle's news when stories arrive, sources change, or the socket reconnects. */
export function useNewsLiveUpdates(circleId: string) {
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();
  const refetch = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: ["news", circleId] }),
    [queryClient, circleId],
  );

  // Pushes sent while the socket was down never arrive.
  useEffect(() => {
    socket.on("connect", refetch);
    return () => {
      socket.off("connect", refetch);
    };
  }, [socket, refetch]);

  useSocketHandler<NewsItemsCreatedPayload>(
    SocketEvent.NewsItemsCreated,
    (payload) => {
      if (payload.circleId === circleId) refetch();
    },
  );

  useSocketHandler<{ circleId?: string }>(
    SocketEvent.NewsSourcesChanged,
    (payload) => {
      if (payload.circleId === circleId) refetch();
    },
  );
}
