import {
  FeedError,
  MAX_ITEMS_PER_FETCH,
  fetchFeed as defaultFetchFeed,
  nextFetchDelayMinutes,
  toNewsItemDto,
  type NewsItemsCreatedPayload,
} from "@tim/news";
import { SocketEvent } from "@tim/socket-types";
import type { NewsFeed } from "@tim/db-types";
import type { AppServer } from "../lib/socket";
import { RoomType, toRoomKey } from "../event-handlers/rooms";
import {
  claimDueFeeds,
  getCircleIdsForFeed,
  insertNewItems,
  pruneNews,
  updateFeedAfterFetch,
} from "../db/news";

const TICK_MS = 30_000;
const FEEDS_PER_TICK = 20;
const CONCURRENCY = 5;
const PRUNE_EVERY_MS = 60 * 60_000;
const KEEP_ITEMS_DAYS = 14;

export type NewsPollerDeps = {
  server: AppServer;
  fetchFeed?: typeof defaultFetchFeed;
  now?: () => Date;
};

/** Fetches due feeds on a timer and pushes new items to every circle following them. */
export function createNewsPoller({
  server,
  fetchFeed = defaultFetchFeed,
  now = () => new Date(),
}: NewsPollerDeps) {
  let timer: NodeJS.Timeout | null = null;
  let running: Promise<void> | null = null;
  let lastPruneAt = 0;

  async function pollFeed(feed: NewsFeed) {
    const startedAt = now();
    try {
      const result = await fetchFeed(feed.url, {
        etag: feed.etag,
        lastModified: feed.lastModified,
      });

      if (result.status === "not-modified") {
        await updateFeedAfterFetch(feed.id, {
          lastFetchedAt: startedAt,
          failureCount: 0,
          nextFetchAt: addMinutes(
            startedAt,
            nextFetchDelayMinutes({
              ttlMinutes: feed.ttlMinutes,
              failureCount: 0,
            }),
          ),
        });
        return;
      }

      const { feed: parsed } = result;
      const created = await insertNewItems({
        feedId: feed.id,
        items: parsed.items.slice(0, MAX_ITEMS_PER_FETCH),
        now: startedAt,
      });
      await updateFeedAfterFetch(feed.id, {
        title: parsed.title || feed.title,
        siteUrl: parsed.siteUrl ?? feed.siteUrl,
        imageUrl: parsed.imageUrl ?? feed.imageUrl,
        ttlMinutes: parsed.ttlMinutes,
        etag: result.etag,
        lastModified: result.lastModified,
        lastFetchedAt: startedAt,
        failureCount: 0,
        nextFetchAt: addMinutes(
          startedAt,
          nextFetchDelayMinutes({
            ttlMinutes: parsed.ttlMinutes,
            failureCount: 0,
          }),
        ),
      });

      if (created.length === 0) return;
      const items = created
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
        .map(toNewsItemDto);
      for (const circleId of await getCircleIdsForFeed(feed.id)) {
        const payload: NewsItemsCreatedPayload = { circleId, items };
        server
          .to(toRoomKey({ id: circleId, roomType: RoomType.Circle }))
          .emit(SocketEvent.NewsItemsCreated, payload);
      }
    } catch (err) {
      const failureCount = feed.failureCount + 1;
      if (!(err instanceof FeedError))
        console.error("[news] poll failed", feed.url, err);
      await updateFeedAfterFetch(feed.id, {
        lastFetchedAt: startedAt,
        failureCount,
        nextFetchAt: addMinutes(
          startedAt,
          nextFetchDelayMinutes({ ttlMinutes: feed.ttlMinutes, failureCount }),
        ),
      }).catch((updateErr) => console.error("[news] update failed", updateErr));
    }
  }

  async function tick() {
    const at = now();
    if (at.getTime() - lastPruneAt >= PRUNE_EVERY_MS) {
      lastPruneAt = at.getTime();
      await pruneNews({ before: addMinutes(at, -KEEP_ITEMS_DAYS * 24 * 60) });
    }
    const feeds = await claimDueFeeds({ now: at, limit: FEEDS_PER_TICK });
    for (let i = 0; i < feeds.length; i += CONCURRENCY) {
      await Promise.all(feeds.slice(i, i + CONCURRENCY).map(pollFeed));
    }
  }

  function runTick() {
    if (running) return running;
    running = tick()
      .catch((err) => console.error("[news] tick failed", err))
      .finally(() => {
        running = null;
      });
    return running;
  }

  return {
    tick: runTick,
    start() {
      if (timer) return;
      void runTick();
      timer = setInterval(() => void runTick(), TICK_MS);
    },
    /** Stops the timer and waits for a tick already in flight, so its writes land before the pool closes. */
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
      await running;
    },
  };
}

export type NewsPoller = ReturnType<typeof createNewsPoller>;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}
