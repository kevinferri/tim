import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedError, type FetchFeedResult, type FeedItem } from "@tim/news";
import { SocketEvent } from "@tim/socket-types";
import { pgClient, resetDb } from "../test/db";
import { createNewsPoller as createPoller } from "./poller";
import type { AppServer } from "../lib/socket";

beforeEach(resetDb);

const T0 = new Date("2026-11-18T12:00:00Z");

// Every News-on circle counts as having someone in the chat, unless a test says otherwise.
function createNewsPoller(deps: Parameters<typeof createPoller>[0]) {
  return createPoller({
    activeCircleIds: () => pgClient("circles").pluck("id"),
    ...deps,
  });
}

async function createCircle({ newsEnabled = true } = {}) {
  const [user] = await pgClient("users")
    .insert({
      id: crypto.randomUUID(),
      googleId: `google-${crypto.randomUUID()}`,
      name: "Test User",
      displayName: "Test",
    })
    .returning(["id"]);
  const [circle] = await pgClient("circles")
    .insert({
      id: crypto.randomUUID(),
      name: "Circle",
      userId: user.id,
      newsEnabled,
    })
    .returning(["id"]);
  return circle.id as string;
}

async function createFeed({
  circleIds,
  nextFetchAt = T0,
}: {
  circleIds: string[];
  nextFetchAt?: Date;
}) {
  const id = crypto.randomUUID();
  await pgClient("news_feeds").insert({
    id,
    url: `https://example.com/${id}.xml`,
    title: "Example",
    nextFetchAt,
  });
  for (const circleId of circleIds) {
    await pgClient("circle_news_sources").insert({ circleId, feedId: id });
  }
  return id;
}

function item(
  n: number,
  publishedAt = new Date(T0.getTime() - n * 60_000),
): FeedItem {
  return {
    guid: `guid-${n}`,
    title: `Story ${n}`,
    link: `https://example.com/story/${n}`,
    summary: null,
    imageUrl: null,
    publishedAt,
  };
}

function ok(items: FeedItem[]): FetchFeedResult {
  return {
    status: "ok",
    feed: {
      title: "Example",
      siteUrl: null,
      imageUrl: null,
      items,
    },
    etag: '"v1"',
    lastModified: null,
  };
}

function mockServer() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { server: { to } as unknown as AppServer, to, emit };
}

describe("news poller", () => {
  it("stores new items and pushes them to every following circle", async () => {
    const [a, b] = [await createCircle(), await createCircle()];
    const feedId = await createFeed({ circleIds: [a, b] });
    const { server, to, emit } = mockServer();
    const fetchFeed = vi.fn(async () => ok([item(2), item(1)]));

    await createNewsPoller({ server, fetchFeed, now: () => T0 }).tick();

    expect(fetchFeed).toHaveBeenCalledWith(expect.stringContaining(feedId), {
      etag: null,
      lastModified: null,
    });
    expect(await pgClient("news_items").where({ feedId })).toHaveLength(2);
    expect(to.mock.calls.map(([room]) => room).sort()).toEqual(
      [`circle::${a}`, `circle::${b}`].sort(),
    );
    const [event, payload] = emit.mock.calls[0];
    expect(event).toBe(SocketEvent.NewsItemsCreated);
    expect(payload.items.map((i: { title: string }) => i.title)).toEqual([
      "Story 1",
      "Story 2",
    ]);

    const feed = await pgClient("news_feeds").where({ id: feedId }).first();
    expect(feed.etag).toBe('"v1"');
    expect(feed.nextFetchAt.toISOString()).toBe("2026-11-18T13:00:00.000Z");
  });

  it("only pushes items it hasn't seen before", async () => {
    const circleId = await createCircle();
    await createFeed({ circleIds: [circleId] });
    const { server, emit } = mockServer();
    let now = T0;
    const fetchFeed = vi
      .fn()
      .mockResolvedValueOnce(ok([item(1)]))
      .mockResolvedValueOnce(ok([item(0), item(1)]))
      .mockResolvedValueOnce(ok([item(0), item(1)]));
    const poller = createNewsPoller({ server, fetchFeed, now: () => now });

    await poller.tick();
    now = new Date(T0.getTime() + 60 * 60_000);
    await poller.tick();
    now = new Date(T0.getTime() + 120 * 60_000);
    await poller.tick();

    expect(emit).toHaveBeenCalledTimes(2);
    expect(
      emit.mock.calls[1][1].items.map((i: { title: string }) => i.title),
    ).toEqual(["Story 0"]);
  });

  it("keeps claiming until every due feed is fetched", async () => {
    const circleId = await createCircle();
    for (let i = 0; i < 45; i++) await createFeed({ circleIds: [circleId] });
    const fetchFeed = vi.fn(async () => ({ status: "not-modified" }) as const);

    await createNewsPoller({
      server: mockServer().server,
      fetchFeed,
      now: () => T0,
    }).tick();

    expect(fetchFeed).toHaveBeenCalledTimes(45);
  });

  it("claims no more batches once stopped", async () => {
    const circleId = await createCircle();
    for (let i = 0; i < 45; i++) await createFeed({ circleIds: [circleId] });
    let poller: ReturnType<typeof createNewsPoller> | null = null;
    let stopped: Promise<void> | null = null;
    const fetchFeed = vi.fn(async () => {
      stopped ??= poller!.stop();
      return { status: "not-modified" } as const;
    });
    poller = createNewsPoller({
      server: mockServer().server,
      fetchFeed,
      now: () => T0,
    });

    await poller.tick();
    await stopped;

    expect(fetchFeed).toHaveBeenCalledTimes(20);
  });

  it("skips feeds that aren't due or that no circle follows", async () => {
    const circleId = await createCircle();
    await createFeed({
      circleIds: [circleId],
      nextFetchAt: new Date(T0.getTime() + 60_000),
    });
    await createFeed({ circleIds: [] });
    const fetchFeed = vi.fn(async () => ok([item(1)]));

    await createNewsPoller({
      server: mockServer().server,
      fetchFeed,
      now: () => T0,
    }).tick();

    expect(fetchFeed).not.toHaveBeenCalled();
  });

  it("retries a failed fetch an hour later", async () => {
    const circleId = await createCircle();
    const feedId = await createFeed({ circleIds: [circleId] });
    const fetchFeed = vi.fn(async () => {
      throw new FeedError("fetch-failed");
    });

    await createNewsPoller({
      server: mockServer().server,
      fetchFeed,
      now: () => T0,
    }).tick();

    const feed = await pgClient("news_feeds").where({ id: feedId }).first();
    expect(feed.nextFetchAt.toISOString()).toBe("2026-11-18T13:00:00.000Z");
  });

  it("only polls feeds of circles with News on and someone in the chat", async () => {
    const [active, idle, off] = [
      await createCircle(),
      await createCircle(),
      await createCircle({ newsEnabled: false }),
    ];
    const activeFeed = await createFeed({ circleIds: [active] });
    await createFeed({ circleIds: [idle] });
    await createFeed({ circleIds: [off] });
    const fetchFeed = vi.fn(async () => ({ status: "not-modified" }) as const);

    await createNewsPoller({
      server: mockServer().server,
      fetchFeed,
      now: () => T0,
      activeCircleIds: async () => [active, off],
    }).tick();

    expect(fetchFeed).toHaveBeenCalledTimes(1);
    expect(fetchFeed.mock.calls[0][0]).toContain(activeFeed);
  });

  it("refreshes a circle's feeds on demand, at most once per 15 minutes each", async () => {
    const circleId = await createCircle();
    const stale = await createFeed({
      circleIds: [circleId],
      nextFetchAt: new Date(T0.getTime() + 40 * 60_000),
    });
    const recent = await createFeed({
      circleIds: [circleId],
      nextFetchAt: new Date(T0.getTime() + 50 * 60_000),
    });
    await pgClient("news_feeds")
      .where({ id: stale })
      .update({ lastFetchedAt: new Date(T0.getTime() - 20 * 60_000) });
    await pgClient("news_feeds")
      .where({ id: recent })
      .update({ lastFetchedAt: new Date(T0.getTime() - 10 * 60_000) });
    const fetchFeed = vi.fn(async () => ({ status: "not-modified" }) as const);

    // Nobody has a topic open: the refresh alone (e.g. the News panel) still fetches.
    await createNewsPoller({
      server: mockServer().server,
      fetchFeed,
      now: () => T0,
      activeCircleIds: async () => [],
    }).refreshCircle(circleId);

    expect(fetchFeed).toHaveBeenCalledTimes(1);
    expect(fetchFeed.mock.calls[0][0]).toContain(stale);
  });

  it("never stores stories older than 24 hours", async () => {
    const circleId = await createCircle();
    const feedId = await createFeed({ circleIds: [circleId] });
    const { server, emit } = mockServer();
    const old = item(99, new Date(T0.getTime() - 25 * 3_600_000));
    const fetchFeed = vi.fn(async () => ok([item(1), old]));

    await createNewsPoller({ server, fetchFeed, now: () => T0 }).tick();

    const guids = (await pgClient("news_items").where({ feedId })).map(
      (r) => r.guid,
    );
    expect(guids).toEqual(["guid-1"]);
    expect(emit.mock.calls[0][1].items).toHaveLength(1);
  });

  it("skips undated and future-dated stories", async () => {
    const circleId = await createCircle();
    const feedId = await createFeed({ circleIds: [circleId] });
    const undated = { ...item(1), guid: "undated", publishedAt: null };
    const future = item(2, new Date(T0.getTime() + 3_600_000));
    const fetchFeed = vi.fn(async () => ok([undated, future, item(3)]));

    await createNewsPoller({
      server: mockServer().server,
      fetchFeed,
      now: () => T0,
    }).tick();

    const guids = (await pgClient("news_items").where({ feedId })).map(
      (r) => r.guid,
    );
    expect(guids).toEqual(["guid-3"]);
  });

  it("deletes a story after 24 hours and never stores it again", async () => {
    const circleId = await createCircle();
    await createFeed({ circleIds: [circleId] });
    const { server, emit } = mockServer();
    let now = T0;
    const fetchFeed = vi.fn(async () => ok([item(1)]));
    const poller = createNewsPoller({ server, fetchFeed, now: () => now });

    await poller.tick();
    // The feed still lists it a day later.
    now = new Date(T0.getTime() + 25 * 3_600_000);
    await poller.tick();

    expect(fetchFeed).toHaveBeenCalledTimes(2);
    expect(await pgClient("news_items")).toHaveLength(0);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("keeps feeds nobody follows, but doesn't poll them", async () => {
    const orphan = await createFeed({ circleIds: [] });
    const fetchFeed = vi.fn();

    await createNewsPoller({
      server: mockServer().server,
      fetchFeed,
      now: () => T0,
    }).tick();

    expect(await pgClient("news_feeds").where({ id: orphan })).toHaveLength(1);
    expect(fetchFeed).not.toHaveBeenCalled();
  });
});
