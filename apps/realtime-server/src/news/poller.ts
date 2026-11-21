import {
  FeedError,
  fetchFeed as defaultFetchFeed,
  nextFetchDelayMinutes,
  selectFreshItems,
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
  markItemsSeen,
  pruneNews,
  updateFeedAfterFetch,
} from "../db/news";

const TICK_MS = 30_000;
const CLAIM_BATCH = 20;
const CONCURRENCY = 10;
// A tick keeps claiming batches until nothing is due, but hands over to the next tick before overlapping it.
const TICK_BUDGET_MS = 25_000;
// Expiry has to keep up with the 24-hour story lifetime; the feed API also hides expired stories on read.
const PRUNE_EVERY_MS = 15 * 60_000;

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
  // Set by stop(): the claim loop finishes its current batch and claims no more.
  let stopping = false;

  async function pollFeed(feed: NewsFeed) {
    const startedAt = now();
    try {
      const result = await fetchFeed(feed.url, {
        etag: feed.etag,
        lastModified: feed.lastModified,
      });

      if (result.status === "not-modified") {
        await markItemsSeen({ feedId: feed.id, now: startedAt });
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
        items: selectFreshItems(parsed.items, startedAt),
        now: startedAt,
      });
      await markItemsSeen({
        feedId: feed.id,
        guids: parsed.items.map((i) => i.guid),
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
      await pruneNews({ now: at });
    }
    const startedAt = Date.now();
    while (!stopping) {
      const feeds = await claimDueFeeds({ now: at, limit: CLAIM_BATCH });
      for (let i = 0; i < feeds.length; i += CONCURRENCY) {
        await Promise.all(feeds.slice(i, i + CONCURRENCY).map(pollFeed));
      }
      if (feeds.length < CLAIM_BATCH) return;
      if (Date.now() - startedAt >= TICK_BUDGET_MS) return;
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
      stopping = false;
      void runTick();
      timer = setInterval(() => void runTick(), TICK_MS);
    },
    /** Stops the timer and waits for a tick already in flight, so its writes land before the pool closes. */
    async stop() {
      stopping = true;
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
