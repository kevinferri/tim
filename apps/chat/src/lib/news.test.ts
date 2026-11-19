import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedFeed } from "@tim/news";
import { prismaClient, resetDb } from "@/test/db";

const resolveFeed = vi.fn<(url: string) => Promise<ResolvedFeed>>();
vi.mock("@tim/news", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tim/news")>()),
  resolveFeed: (url: string) => resolveFeed(url),
}));

const { FeedError } = await import("@tim/news");
const {
  addCircleNewsSource,
  getCircleNews,
  getNewsLinkPreview,
  removeCircleNewsSource,
  siteOf,
} = await import("./news");

beforeEach(async () => {
  await resetDb();
  resolveFeed.mockReset();
});

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

async function createCircle(ownerId: string) {
  return prismaClient.circle.create({
    data: {
      name: "Circle",
      userId: ownerId,
      members: { connect: [{ id: ownerId }] },
    },
  });
}

function feed(url: string, count: number, title = "Example"): ResolvedFeed {
  return {
    url,
    etag: null,
    lastModified: null,
    feed: {
      title,
      siteUrl: "https://example.com/",
      imageUrl: null,
      ttlMinutes: null,
      items: Array.from({ length: count }, (_, n) => ({
        guid: `${url}#${n}`,
        title: `Story ${n}`,
        link: `https://example.com/${n}`,
        summary: null,
        imageUrl: null,
        publishedAt: new Date(Date.now() - (n + 1) * 60_000),
      })),
    },
  };
}

describe("addCircleNewsSource", () => {
  it("stores the feed and its items once, however many circles follow it", async () => {
    const user = await createUser("Ann");
    const [a, b] = [await createCircle(user.id), await createCircle(user.id)];
    resolveFeed.mockResolvedValue(feed("https://example.com/rss", 3));

    const source = await addCircleNewsSource({
      circleId: a.id,
      userId: user.id,
      url: "example.com",
    });
    await addCircleNewsSource({
      circleId: b.id,
      userId: user.id,
      url: "example.com",
    });

    expect(source.title).toBe("Example");
    expect(await prismaClient.newsFeed.count()).toBe(1);
    expect(await prismaClient.newsItem.count()).toBe(3);
    expect(await prismaClient.circleNewsSource.count()).toBe(2);
  });

  it("leaves a feed that's already followed to the poller", async () => {
    const user = await createUser("Ann");
    const [a, b] = [await createCircle(user.id), await createCircle(user.id)];
    resolveFeed.mockResolvedValueOnce(feed("https://example.com/rss", 2));
    await addCircleNewsSource({ circleId: a.id, userId: user.id, url: "x" });
    // By the time a second circle adds it, the feed has a newer story.
    resolveFeed.mockResolvedValueOnce(feed("https://example.com/rss", 3));
    await addCircleNewsSource({ circleId: b.id, userId: user.id, url: "x" });

    expect(await prismaClient.newsItem.count()).toBe(2);
  });

  it("skips stories older than the retention window and duplicate guids", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    const resolved = feed("https://example.com/rss", 2);
    resolved.feed.items.push(
      { ...resolved.feed.items[0] },
      {
        ...resolved.feed.items[1],
        guid: "old",
        publishedAt: new Date(Date.now() - 30 * 86_400_000),
      },
    );
    resolveFeed.mockResolvedValue(resolved);
    await addCircleNewsSource({
      circleId: circle.id,
      userId: user.id,
      url: "x",
    });

    expect(await prismaClient.newsItem.count()).toBe(2);
  });

  it("rejects a source the circle already follows", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    resolveFeed.mockResolvedValue(feed("https://example.com/rss", 1));
    await addCircleNewsSource({
      circleId: circle.id,
      userId: user.id,
      url: "example.com",
    });

    await expect(
      addCircleNewsSource({
        circleId: circle.id,
        userId: user.id,
        url: "example.com",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("turns feed errors into a readable 400", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    resolveFeed.mockRejectedValue(new FeedError("not-a-feed"));

    await expect(
      addCircleNewsSource({
        circleId: circle.id,
        userId: user.id,
        url: "example.com",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/news feed/),
    });
    expect(await prismaClient.newsFeed.count()).toBe(0);
  });
});

describe("getCircleNews", () => {
  it("pages newest first across the circle's sources and filters by source", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    const other = await createCircle(user.id);
    resolveFeed.mockResolvedValueOnce(feed("https://a.com/rss", 20, "A"));
    resolveFeed.mockResolvedValueOnce(feed("https://b.com/rss", 20, "B"));
    resolveFeed.mockResolvedValueOnce(feed("https://c.com/rss", 5, "C"));
    const a = await addCircleNewsSource({
      circleId: circle.id,
      userId: user.id,
      url: "a.com",
    });
    await addCircleNewsSource({
      circleId: circle.id,
      userId: user.id,
      url: "b.com",
    });
    await addCircleNewsSource({
      circleId: other.id,
      userId: user.id,
      url: "c.com",
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

  it("ignores a feed filter for a source the circle doesn't follow", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    const other = await createCircle(user.id);
    resolveFeed.mockResolvedValue(feed("https://c.com/rss", 5));
    const c = await addCircleNewsSource({
      circleId: other.id,
      userId: user.id,
      url: "c.com",
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
    resolveFeed.mockResolvedValue(feed("https://a.com/rss", 1));
    const source = await addCircleNewsSource({
      circleId: circle.id,
      userId: adder.id,
      url: "a.com",
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
  it("previews a stored story's link from its own fields", async () => {
    const user = await createUser("Ann");
    const circle = await createCircle(user.id);
    resolveFeed.mockResolvedValue(
      feed("https://feeds.example.com/rss", 2, "A"),
    );
    await addCircleNewsSource({
      circleId: circle.id,
      userId: user.id,
      url: "example.com",
    });

    expect(await getNewsLinkPreview("https://example.com/1")).toEqual({
      ogSiteName: "A",
      ogTitle: "Story 1",
      ogDescription: undefined,
      ogImage: undefined,
    });
    expect(await getNewsLinkPreview("https://example.com/nope")).toBeNull();
  });

  it("ignores items from a feed hosted on another site", async () => {
    const user = await createUser("Mallory");
    const circle = await createCircle(user.id);
    // Claims example.com links (and siteUrl) but was fetched from evil.test.
    resolveFeed.mockResolvedValue(feed("https://evil.test/rss", 2, "Fake"));
    await addCircleNewsSource({
      circleId: circle.id,
      userId: user.id,
      url: "evil.test",
    });

    expect(await getNewsLinkPreview("https://example.com/1")).toBeNull();
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
});
