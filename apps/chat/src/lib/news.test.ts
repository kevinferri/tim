import { beforeEach, describe, expect, it } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import {
  addCircleNewsSource,
  feedForSourceRequest,
  getCircleNews,
  getNewsLinkPreview,
  removeCircleNewsSource,
  setNewsEnabled,
  siteOf,
} from "./news";
import { NEWS_PRESETS } from "./news-sources";

beforeEach(resetDb);

async function createUser(name: string) {
  return prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name,
      displayName: name,
      email: `${crypto.randomUUID()}@example.com`,
    },
  });
}

async function createCircle(ownerId: string, { newsEnabled = true } = {}) {
  return prismaClient.circle.create({
    data: {
      name: "Circle",
      userId: ownerId,
      newsEnabled,
      members: { connect: [{ id: ownerId }] },
    },
  });
}

/** Follows a feed, then stores `count` stories in it the way the realtime server's poller would. */
async function follow({
  circleId,
  userId,
  url,
  count = 0,
  title = "Example",
}: {
  circleId: string;
  userId: string;
  url: string;
  count?: number;
  title?: string;
}) {
  const source = await addCircleNewsSource({ circleId, userId, url, title });
  await prismaClient.newsItem.createMany({
    data: Array.from({ length: count }, (_, n) => ({
      feedId: source.feedId,
      guid: `${url}#${n}`,
      title: `Story ${n}`,
      link: `https://example.com/${n}`,
      publishedAt: new Date(Date.now() - (n + 1) * 60_000),
    })),
  });
  return source;
}

describe("feedForSourceRequest", () => {
  it("accepts a preset, by its feed URL", () => {
    const [preset] = NEWS_PRESETS;
    expect(feedForSourceRequest({ preset: preset.url })).toEqual({
      url: preset.url,
      title: preset.name,
    });
  });

  it("turns a topic into its Google News feed", () => {
    expect(feedForSourceRequest({ topic: " Knicks " })).toEqual({
      url: "https://news.google.com/rss/search?q=knicks&hl=en-US&gl=US&ceid=US:en",
      title: "Knicks · Google News",
    });
  });

  it("rejects any other address and blank topics", () => {
    for (const request of [
      { preset: "https://evil.test/rss" },
      { topic: "   " },
    ]) {
      expect(() => feedForSourceRequest(request)).toThrow(
        expect.objectContaining({ status: 400 }),
      );
    }
  });
});

describe("addCircleNewsSource", () => {
  it("stores a feed once, however many circles follow it", async () => {
    const user = await createUser("Ann");
    const [a, b] = [await createCircle(user.id), await createCircle(user.id)];

    const source = await follow({
      circleId: a.id,
      userId: user.id,
      url: "https://example.com/rss",
    });
    await follow({
      circleId: b.id,
      userId: user.id,
      url: "https://example.com/rss",
      title: "Ignored",
    });

    expect(source.title).toBe("Example");
    expect(await prismaClient.newsFeed.count()).toBe(1);
    expect(await prismaClient.circleNewsSource.count()).toBe(2);
    // Nothing is fetched here; the poller loads it on its next tick.
    const feed = await prismaClient.newsFeed.findUniqueOrThrow({
      where: { id: source.feedId },
    });
    expect(feed.lastFetchedAt).toBeNull();
    expect(feed.nextFetchAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("rejects a source the circle already follows", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    const add = () =>
      follow({
        circleId: circle.id,
        userId: user.id,
        url: "https://example.com/rss",
      });
    await add();

    await expect(add()).rejects.toMatchObject({ status: 409 });
  });

  it("rejects sources while News is off", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id, { newsEnabled: false });

    await expect(
      follow({
        circleId: circle.id,
        userId: user.id,
        url: "https://example.com/rss",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(await prismaClient.newsFeed.count()).toBe(0);
  });
});

describe("setNewsEnabled", () => {
  it("lets only the circle's creator turn News on or off, keeping its sources", async () => {
    const owner = await createUser("Owner");
    const member = await createUser("Member");
    const circle = await createCircle(owner.id);
    await follow({
      circleId: circle.id,
      userId: owner.id,
      url: "https://example.com/rss",
      count: 2,
    });

    await expect(
      setNewsEnabled({
        circleId: circle.id,
        userId: member.id,
        enabled: false,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await setNewsEnabled({
      circleId: circle.id,
      userId: owner.id,
      enabled: false,
    });

    const off = await getCircleNews({ circleId: circle.id, userId: owner.id });
    expect(off).toMatchObject({ enabled: false, isAdmin: true, items: [] });
    expect(await prismaClient.circleNewsSource.count()).toBe(1);

    await setNewsEnabled({
      circleId: circle.id,
      userId: owner.id,
      enabled: true,
    });
    const on = await getCircleNews({ circleId: circle.id, userId: member.id });
    expect(on).toMatchObject({ enabled: true, isAdmin: false });
    expect(on.items).toHaveLength(2);
  });
});

describe("getCircleNews", () => {
  it("pages newest first across the circle's sources and filters by source", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    const other = await createCircle(user.id);
    const a = await follow({
      circleId: circle.id,
      userId: user.id,
      url: "https://a.com/rss",
      count: 20,
      title: "A",
    });
    await follow({
      circleId: circle.id,
      userId: user.id,
      url: "https://b.com/rss",
      count: 20,
      title: "B",
    });
    await follow({
      circleId: other.id,
      userId: user.id,
      url: "https://c.com/rss",
      count: 5,
      title: "C",
    });

    const first = await getCircleNews({ circleId: circle.id, userId: user.id });
    expect(first.sources.map((s) => s.title)).toEqual(["A", "B"]);
    expect(first.sources.every((s) => s.canRemove)).toBe(true);
    expect(first.items).toHaveLength(30);
    expect(first.nextCursor).not.toBeNull();
    const second = await getCircleNews({
      circleId: circle.id,
      userId: user.id,
      cursor: first.nextCursor,
    });
    expect(second.items).toHaveLength(10);
    expect(second.nextCursor).toBeNull();
    const all = [...first.items, ...second.items];
    expect(new Set(all.map((i) => i.id)).size).toBe(40);
    const times = all.map((i) => i.publishedAt);
    expect(times).toEqual([...times].sort().reverse());

    const onlyA = await getCircleNews({
      circleId: circle.id,
      userId: user.id,
      feedId: a.feedId,
    });
    expect(onlyA.items.every((i) => i.feedId === a.feedId)).toBe(true);
    expect(onlyA.items).toHaveLength(20);
  });

  it("reports the newest arrival even when it's not on page 1", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    const source = await follow({
      circleId: circle.id,
      userId: user.id,
      url: "https://a.com/rss",
      count: 40,
    });
    // Stored just now but published hours ago, so it sorts past the first 30.
    const late = await prismaClient.newsItem.create({
      data: {
        feedId: source.feedId,
        guid: "late",
        title: "Late arrival",
        link: "https://example.com/late",
        publishedAt: new Date(Date.now() - 5 * 3_600_000),
        createdAt: new Date(Date.now() + 1_000),
      },
    });

    const res = await getCircleNews({ circleId: circle.id, userId: user.id });
    expect(res.items.some((i) => i.id === late.id)).toBe(false);
    expect(res.newestCreatedAt).toBe(late.createdAt.toISOString());
  });

  it("only lists stories from the last 72 hours", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    const source = await follow({
      circleId: circle.id,
      userId: user.id,
      url: "https://a.com/rss",
      count: 2,
    });
    await prismaClient.newsItem.create({
      data: {
        feedId: source.feedId,
        guid: "yesterday",
        title: "Yesterday",
        link: "https://example.com/yesterday",
        publishedAt: new Date(Date.now() - 73 * 3_600_000),
      },
    });

    const res = await getCircleNews({ circleId: circle.id, userId: user.id });
    expect(res.items.map((i) => i.title)).toEqual(["Story 0", "Story 1"]);
  });

  it("ignores a feed filter for a source the circle doesn't follow", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    const other = await createCircle(user.id);
    const c = await follow({
      circleId: other.id,
      userId: user.id,
      url: "https://c.com/rss",
      count: 5,
    });

    const res = await getCircleNews({
      circleId: circle.id,
      userId: user.id,
      feedId: c.feedId,
    });
    expect(res.items).toEqual([]);
  });
});

describe("removeCircleNewsSource", () => {
  it("lets the adder or the circle creator remove a source, and no one else", async () => {
    const owner = await createUser("Owner");
    const adder = await createUser("Adder");
    const bystander = await createUser("Bystander");
    const circle = await createCircle(owner.id);
    const source = await follow({
      circleId: circle.id,
      userId: adder.id,
      url: "https://a.com/rss",
      count: 1,
    });

    await expect(
      removeCircleNewsSource({
        circleId: circle.id,
        feedId: source.feedId,
        userId: bystander.id,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await removeCircleNewsSource({
      circleId: circle.id,
      feedId: source.feedId,
      userId: owner.id,
    });
    expect(await prismaClient.circleNewsSource.count()).toBe(0);
    await expect(
      removeCircleNewsSource({
        circleId: circle.id,
        feedId: source.feedId,
        userId: owner.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("getNewsLinkPreview", () => {
  async function createTopic(circleId: string, userId: string) {
    return prismaClient.topic.create({
      data: { name: "General", circleId, userId },
    });
  }

  it("previews a story from a feed the topic's circle follows", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    const topic = await createTopic(circle.id, user.id);
    await follow({
      circleId: circle.id,
      userId: user.id,
      url: "https://feeds.example.com/rss",
      count: 2,
      title: "A",
    });

    const preview = (url: string) =>
      getNewsLinkPreview({ url, topicId: topic.id, userId: user.id });
    expect(await preview("https://example.com/1")).toEqual({
      ogSiteName: "A",
      ogTitle: "Story 1",
      ogDescription: undefined,
      ogImage: undefined,
    });
    expect(await preview("https://example.com/nope")).toBeNull();
  });

  it("ignores stories from feeds the circle doesn't follow", async () => {
    const user = await createUser("Ann");
    const following = await createCircle(user.id);
    const other = await createCircle(user.id);
    const topic = await createTopic(other.id, user.id);
    await follow({
      circleId: following.id,
      userId: user.id,
      url: "https://feeds.example.com/rss",
      count: 2,
    });

    expect(
      await getNewsLinkPreview({
        url: "https://example.com/1",
        topicId: topic.id,
        userId: user.id,
      }),
    ).toBeNull();
  });

  it("ignores items from a feed hosted on another site", async () => {
    const user = await createUser("Mallory");
    const circle = await createCircle(user.id);
    const topic = await createTopic(circle.id, user.id);
    // Claims example.com links (and siteUrl) but was fetched from evil.test.
    await follow({
      circleId: circle.id,
      userId: user.id,
      url: "https://evil.test/rss",
      count: 2,
      title: "Fake",
    });

    expect(
      await getNewsLinkPreview({
        url: "https://example.com/1",
        topicId: topic.id,
        userId: user.id,
      }),
    ).toBeNull();
  });

  it("returns nothing to someone outside the topic's circle", async () => {
    const member = await createUser("Ann");
    const outsider = await createUser("Eve");
    const circle = await createCircle(member.id);
    const topic = await createTopic(circle.id, member.id);
    await follow({
      circleId: circle.id,
      userId: member.id,
      url: "https://feeds.example.com/rss",
      count: 2,
    });

    expect(
      await getNewsLinkPreview({
        url: "https://example.com/1",
        topicId: topic.id,
        userId: outsider.id,
      }),
    ).toBeNull();
  });
});

describe("siteOf", () => {
  it("groups subdomains under their site", () => {
    expect(siteOf("rss.nytimes.com")).toBe("nytimes.com");
    expect(siteOf("www.nytimes.com")).toBe("nytimes.com");
    expect(siteOf("feeds.bbci.co.uk")).toBe("bbci.co.uk");
    expect(siteOf("www.bbc.co.uk")).toBe("bbc.co.uk");
    expect(siteOf("news.google.com")).toBe("google.com");
  });

  it("keeps sites on shared hosts apart", () => {
    expect(siteOf("attacker.github.io")).toBe("attacker.github.io");
    expect(siteOf("victim.github.io")).toBe("victim.github.io");
  });
});
