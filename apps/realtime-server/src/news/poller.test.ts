import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedError, type FetchFeedResult, type FeedItem } from "@tim/news";
import { SocketEvent } from "@tim/socket-types";
import { pgClient, resetDb } from "../test/db";
import { createNewsPoller } from "./poller";
import type { AppServer } from "../lib/socket";

beforeEach(resetDb);

const T0 = new Date("2026-11-18T12:00:00Z");

async function createCircle() {
  const [user] = await pgClient("users")
    .insert({
      id: crypto.randomUUID(),
      googleId: `google-${crypto.randomUUID()}`,
      name: "Test User",
      displayName: "Test",
    })
    .returning(["id"]);
  const [circle] = await pgClient("circles")
    .insert({ id: crypto.randomUUID(), name: "Circle", userId: user.id })
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

function ok(
  items: FeedItem[],
  ttlMinutes: number | null = null,
): FetchFeedResult {
  return {
    status: "ok",
    feed: {
      title: "Example",
      siteUrl: null,
      imageUrl: null,
      ttlMinutes,
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
    const fetchFeed = vi.fn(async () => ok([item(2), item(1)], 15));

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
    expect(feed.ttlMinutes).toBe(15);
    expect(feed.nextFetchAt.toISOString()).toBe("2026-11-18T12:15:00.000Z");
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
    now = new Date(T0.getTime() + 5 * 60_000);
    await poller.tick();
    now = new Date(T0.getTime() + 10 * 60_000);
    await poller.tick();

    expect(emit).toHaveBeenCalledTimes(2);
    expect(
      emit.mock.calls[1][1].items.map((i: { title: string }) => i.title),
    ).toEqual(["Story 0"]);
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

  it("backs off after a failed fetch and recovers on success", async () => {
    const circleId = await createCircle();
    const feedId = await createFeed({ circleIds: [circleId] });
    let now = T0;
    const fetchFeed = vi
      .fn()
      .mockRejectedValueOnce(new FeedError("fetch-failed"))
      .mockResolvedValueOnce({ status: "not-modified" });
    const poller = createNewsPoller({
      server: mockServer().server,
      fetchFeed,
      now: () => now,
    });

    await poller.tick();
    let feed = await pgClient("news_feeds").where({ id: feedId }).first();
    expect(feed.failureCount).toBe(1);
    expect(feed.nextFetchAt.toISOString()).toBe("2026-11-18T12:10:00.000Z");

    now = new Date(T0.getTime() + 10 * 60_000);
    await poller.tick();
    feed = await pgClient("news_feeds").where({ id: feedId }).first();
    expect(feed.failureCount).toBe(0);
    expect(feed.nextFetchAt.toISOString()).toBe("2026-11-18T12:15:00.000Z");
  });

  it("prunes old items and feeds nobody follows", async () => {
    const circleId = await createCircle();
    const followed = await createFeed({
      circleIds: [circleId],
      nextFetchAt: new Date(T0.getTime() + 60_000),
    });
    const orphan = await createFeed({ circleIds: [] });
    await pgClient("news_items").insert([
      {
        id: crypto.randomUUID(),
        feedId: followed,
        guid: "old",
        title: "Old",
        link: "https://e.com/o",
        publishedAt: T0,
        createdAt: new Date(T0.getTime() - 15 * 86_400_000),
      },
      {
        id: crypto.randomUUID(),
        feedId: followed,
        guid: "new",
        title: "New",
        link: "https://e.com/n",
        publishedAt: T0,
        createdAt: T0,
      },
    ]);

    await createNewsPoller({
      server: mockServer().server,
      fetchFeed: vi.fn(),
      now: () => T0,
    }).tick();

    expect((await pgClient("news_items")).map((r) => r.guid)).toEqual(["new"]);
    expect(await pgClient("news_feeds").where({ id: orphan })).toHaveLength(0);
  });
});
