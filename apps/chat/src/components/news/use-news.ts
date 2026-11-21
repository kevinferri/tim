"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { NewsItemsCreatedPayload } from "@tim/news";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useSocketContext } from "@/components/socket/socket-provider";
import {
  fetchNews,
  newerThanListed,
  newsQueryKey,
  prependNewsItems,
  type NewsCache,
  type NewsItemDto,
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
    // Live pushes and the reconnect refetch keep it current; a focus refetch would also jump the list under the reader.
    refetchOnWindowFocus: false,
  });
}

/** When the circle's newest story arrived: from the API (which looks past page 1) or from a live push since. */
export function useNewestArrival(circleId: string): string | null {
  const { data } = useNewsFeed(circleId);
  const fromApi = data?.pages[0]?.newestCreatedAt ?? null;
  const fromLive = useNewsStore((s) => s.liveNewest[circleId] ?? null);
  if (!fromApi) return fromLive;
  return fromLive && fromLive > fromApi ? fromLive : fromApi;
}

/** True when a story arrived after the newest one the viewer has seen. */
export function useHasUnreadNews(circleId: string) {
  const newest = useNewestArrival(circleId);
  const seen = useNewsSeen(circleId);
  // The server never has the feed or what this browser has seen, so render no dot until hydrated.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
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

  // A refetch that read the DB before a push landed would overwrite it, so
  // recently merged pushes are re-applied whenever a fetch of this circle's
  // news completes (the merge skips what's already listed).
  const mergeLive = (items: NewsItemDto[]) => {
    if (items.length === 0) return;
    rememberLive(circleId, items);
    prependNewsItems(queryClient, circleId, items);
  };

  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== "updated" || event.action.type !== "success") return;
        if ("manual" in event.action && event.action.manual) return;
        const [scope, keyCircleId] = event.query.queryKey;
        if (scope !== "news" || keyCircleId !== circleId) return;
        // Only stories from sources the circle still follows survive a refetch.
        const followed = followedFeedIds(queryClient, circleId);
        const recent = recentLive(circleId).filter(
          (i) => !followed || followed.has(i.feedId),
        );
        if (followed) {
          pruneRecent(circleId, followed);
          useNewsStore.getState().resetLive(circleId, recent);
        }
        if (recent.length) prependNewsItems(queryClient, circleId, recent);
      }),
    [queryClient, circleId],
  );

  useSocketHandler<NewsItemsCreatedPayload>(
    SocketEvent.NewsItemsCreated,
    (payload) => {
      if (payload.circleId !== circleId) return;
      // A push can race a source's removal; ignore stories from feeds the circle no longer follows.
      const followed = followedFeedIds(queryClient, circleId);
      payload = {
        ...payload,
        items: payload.items.filter((i) => !followed || followed.has(i.feedId)),
      };
      if (payload.items.length === 0) return;
      useNewsStore.getState().noteLive(circleId, payload.items);
      if (!useNewsStore.getState().open) {
        mergeLive(payload.items);
        return;
      }
      // While reading, only stories that will appear at the top of the view on screen wait behind the pill; the rest go straight to their place.
      const feedId = useNewsStore.getState().filter[circleId] ?? null;
      const top = newerThanListed(
        queryClient.getQueryData<NewsCache>(newsQueryKey(circleId, feedId))
          ?.pages,
        payload.items.filter((i) => feedId === null || i.feedId === feedId),
      );
      const topIds = new Set(top.map((i) => i.id));
      mergeLive(payload.items.filter((i) => !topIds.has(i.id)));
      if (top.length > 0) useNewsStore.getState().addPending(circleId, top);
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

const RECENT_LIVE_MS = 5 * 60_000;
const recentByCircle = new Map<string, { item: NewsItemDto; at: number }[]>();

function rememberLive(circleId: string, items: NewsItemDto[]) {
  const now = Date.now();
  const kept = (recentByCircle.get(circleId) ?? []).filter(
    (r) => now - r.at < RECENT_LIVE_MS,
  );
  recentByCircle.set(circleId, [
    ...kept,
    ...items.map((item) => ({ item, at: now })),
  ]);
}

function recentLive(circleId: string): NewsItemDto[] {
  const now = Date.now();
  return (recentByCircle.get(circleId) ?? [])
    .filter((r) => now - r.at < RECENT_LIVE_MS)
    .map((r) => r.item);
}

function pruneRecent(circleId: string, followed: Set<string>) {
  const kept = (recentByCircle.get(circleId) ?? []).filter((r) =>
    followed.has(r.item.feedId),
  );
  recentByCircle.set(circleId, kept);
}

/** Feeds the circle follows, per the loaded All view; null before it has loaded. */
function followedFeedIds(
  queryClient: QueryClient,
  circleId: string,
): Set<string> | null {
  const sources = queryClient.getQueryData<NewsCache>(newsQueryKey(circleId))
    ?.pages[0]?.sources;
  return sources ? new Set(sources.map((s) => s.feedId)) : null;
}
