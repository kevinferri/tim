import {
  FeedError,
  fetchFeed as defaultFetchFeed,
  POLL_INTERVAL_MINUTES,
  selectFreshItems,
  toNewsItemDto,
  type NewsItemsCreatedPayload,
} from "@tim/news";
import { SocketEvent } from "@tim/socket-types";
import type { NewsFeed } from "@tim/db-types";
import type { AppServer } from "../lib/socket";
import { RoomType, parseRoomKey, toRoomKey } from "../event-handlers/rooms";
import {
  claimDueFeeds,
  getCircleIdsForFeed,
  getCircleIdsForTopics,
  insertNewItems,
  markCircleFeedsDue,
  pruneNews,
  updateFeedAfterFetch,
} from "../db/news";

const TICK_MS = 30_000;
const CLAIM_BATCH = 20;
const CONCURRENCY = 10;
// A tick keeps claiming batches until nothing is due, but hands over to the next tick before overlapping it.
const TICK_BUDGET_MS = 25_000;
// Deletion keeps up with the story lifetime; the feed API also hides expired stories on read.
const PRUNE_EVERY_MS = 15 * 60_000;

export type NewsPollerDeps = {
  server: AppServer;
  fetchFeed?: typeof defaultFetchFeed;
  now?: () => Date;
  /** Circles with someone in the chat; only their feeds are polled. */
  activeCircleIds?: () => Promise<string[]>;
};

/** Topic rooms are only joined while a topic is open, unlike circle rooms, which every open tab joins for all its circles. */
function activeCircleIdsFrom(server: AppServer) {
  return () => {
    const topicIds: string[] = [];
    for (const [key, sockets] of server.sockets.adapter.rooms) {
      if (sockets.size === 0) continue;
      const { roomType, id } = parseRoomKey(key);
      if (roomType === RoomType.Topic && id) topicIds.push(id);
    }
    return getCircleIdsForTopics(topicIds);
  };
}

/** Fetches due feeds on a timer and pushes new items to every circle following them. */
export function createNewsPoller({
  server,
  fetchFeed = defaultFetchFeed,
  now = () => new Date(),
  activeCircleIds = activeCircleIdsFrom(server),
}: NewsPollerDeps) {
  let timer: NodeJS.Timeout | null = null;
  let running: Promise<void> | null = null;
  // A refresh that arrives mid-tick runs another tick right after, instead of waiting for the timer.
  let rerun = false;
  // Refreshed circles are polled on the next tick even if nobody has a topic open (e.g. only the News panel).
  const refreshed = new Set<string>();
  let lastPruneAt = 0;
  // Set by stop(): the claim loop finishes its current batch and claims no more.
  let stopping = false;

  async function pollFeed(feed: NewsFeed) {
    const startedAt = now();
    const nextFetchAt = addMinutes(startedAt, POLL_INTERVAL_MINUTES);
    try {
      const result = await fetchFeed(feed.url, {
        etag: feed.etag,
        lastModified: feed.lastModified,
      });

      if (result.status === "not-modified") {
        await updateFeedAfterFetch(feed.id, {
          lastFetchedAt: startedAt,
          nextFetchAt,
        });
        return;
      }

      const { feed: parsed } = result;
      const created = await insertNewItems({
        feedId: feed.id,
        items: selectFreshItems(parsed.items, startedAt),
        now: startedAt,
      });
      // The title stays as set when the source was added (a preset's name, or the topic as typed).
      await updateFeedAfterFetch(feed.id, {
        siteUrl: parsed.siteUrl ?? feed.siteUrl,
        imageUrl: parsed.imageUrl ?? feed.imageUrl,
        etag: result.etag,
        lastModified: result.lastModified,
        lastFetchedAt: startedAt,
        nextFetchAt,
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
      if (err instanceof FeedError)
        console.warn("[news] fetch failed", feed.url, err.code, err.message);
      else console.error("[news] poll failed", feed.url, err);
      await updateFeedAfterFetch(feed.id, {
        lastFetchedAt: startedAt,
        nextFetchAt,
      }).catch((updateErr) => console.error("[news] update failed", updateErr));
    }
  }

  async function tick() {
    const at = now();
    if (at.getTime() - lastPruneAt >= PRUNE_EVERY_MS) {
      lastPruneAt = at.getTime();
      await pruneNews({ now: at });
    }
    const circleIds = [
      ...new Set([...(await activeCircleIds()), ...refreshed]),
    ];
    refreshed.clear();
    const startedAt = Date.now();
    while (!stopping) {
      const feeds = await claimDueFeeds({
        now: at,
        limit: CLAIM_BATCH,
        circleIds,
      });
      for (let i = 0; i < feeds.length; i += CONCURRENCY) {
        await Promise.all(feeds.slice(i, i + CONCURRENCY).map(pollFeed));
      }
      if (feeds.length < CLAIM_BATCH) return;
      if (Date.now() - startedAt >= TICK_BUDGET_MS) return;
    }
  }

  function runTick(): Promise<void> {
    if (running) {
      rerun = true;
      return running;
    }
    rerun = false;
    running = tick()
      .catch((err) => console.error("[news] tick failed", err))
      .finally(() => {
        running = null;
        if (rerun && !stopping) void runTick();
      });
    return running;
  }

  return {
    tick: runTick,
    /** Someone opened the circle or its News panel: fetch its feeds now, at most once per feed per REFRESH_THROTTLE_MINUTES. */
    async refreshCircle(circleId: string) {
      if (stopping) return;
      let due: number;
      try {
        due = await markCircleFeedsDue({ circleId, now: now() });
      } catch (err) {
        console.error("[news] refresh failed", err);
        return;
      }
      // Topic joins (every reconnect re-joins) mostly land inside the throttle; skip the tick then.
      if (due === 0) return;
      refreshed.add(circleId);
      await runTick();
    },
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
