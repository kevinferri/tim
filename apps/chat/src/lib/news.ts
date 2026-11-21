import {
  FeedError,
  nextFetchDelayMinutes,
  resolveFeed,
  selectFreshItems,
  storyCutoff,
  toNewsItemDto,
  type NewsItemDto,
  type ResolvedFeed,
} from "@tim/news";
import { Prisma } from "@prisma/client";
import { getDomain } from "tldts";
import { prismaClient } from "@/lib/prisma/client";
import { ApiError } from "@/lib/api";

export const MAX_SOURCES_PER_CIRCLE = 20;
const PAGE_SIZE = 30;

export type NewsSourceDto = {
  feedId: string;
  url: string;
  title: string;
  siteUrl: string | null;
  imageUrl: string | null;
  addedById: string | null;
  createdAt: string;
  /** Whether the viewer may remove it: they added it or created the circle. */
  canRemove: boolean;
};

export type NewsResponse = {
  sources: NewsSourceDto[];
  items: NewsItemDto[];
  /** Pass back as `cursor` for the next (older) page; null when there is none. */
  nextCursor: string | null;
  /**
   * When the newest story in this view arrived, for the unread dot. Pages are
   * ordered by publish date, so a story stored now but dated hours earlier
   * may not be on page 1.
   */
  newestCreatedAt: string | null;
};

function encodeCursor(item: { publishedAt: Date; id: string }) {
  return `${item.publishedAt.toISOString()}_${item.id}`;
}

function decodeCursor(cursor: string) {
  const split = cursor.indexOf("_");
  const publishedAt = new Date(cursor.slice(0, split));
  const id = cursor.slice(split + 1);
  if (split < 0 || Number.isNaN(publishedAt.getTime()) || !id) {
    throw new ApiError(400);
  }
  return { publishedAt, id };
}

export async function getCircleNews({
  circleId,
  userId,
  feedId,
  cursor,
}: {
  circleId: string;
  userId: string;
  feedId?: string | null;
  cursor?: string | null;
}): Promise<NewsResponse> {
  const circle = await prismaClient.circle.findUnique({
    where: { id: circleId },
    select: { userId: true },
  });
  const isCreator = circle?.userId === userId;
  const sourceRows = await prismaClient.circleNewsSource.findMany({
    where: { circleId },
    orderBy: { createdAt: "asc" },
    select: {
      addedById: true,
      createdAt: true,
      feed: {
        select: {
          id: true,
          url: true,
          title: true,
          siteUrl: true,
          imageUrl: true,
        },
      },
    },
  });
  const sources = sourceRows.map((s) => ({
    feedId: s.feed.id,
    url: s.feed.url,
    title: s.feed.title,
    siteUrl: s.feed.siteUrl,
    imageUrl: s.feed.imageUrl,
    addedById: s.addedById,
    createdAt: s.createdAt.toISOString(),
    canRemove: isCreator || s.addedById === userId,
  }));

  const feedIds = feedId
    ? sources.some((s) => s.feedId === feedId)
      ? [feedId]
      : []
    : sources.map((s) => s.feedId);
  if (feedIds.length === 0) {
    return { sources, items: [], nextCursor: null, newestCreatedAt: null };
  }

  const live = {
    feedId: { in: feedIds },
    // The feed hosts a story for 24 hours; this hides it on time even before the poller erases it.
    publishedAt: { gte: storyCutoff(new Date()) },
    expiredAt: null,
  };
  const after = cursor ? decodeCursor(cursor) : null;
  const [rows, newest] = await Promise.all([
    prismaClient.newsItem.findMany({
      where: {
        ...live,
        ...(after && {
          OR: [
            { publishedAt: { lt: after.publishedAt } },
            { publishedAt: after.publishedAt, id: { lt: after.id } },
          ],
        }),
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
    }),
    prismaClient.newsItem.aggregate({ where: live, _max: { createdAt: true } }),
  ]);
  const page = rows.slice(0, PAGE_SIZE);
  return {
    sources,
    items: page.map(toNewsItemDto),
    nextCursor:
      rows.length > PAGE_SIZE ? encodeCursor(page[page.length - 1]) : null,
    newestCreatedAt: newest._max.createdAt?.toISOString() ?? null,
  };
}

const FEED_ERROR_MESSAGES: Record<FeedError["code"], string> = {
  "invalid-url": "That doesn't look like a web address.",
  blocked: "That address can't be used as a news source.",
  "fetch-failed": "Couldn't reach that site. Check the address and try again.",
  "too-large": "That feed is too large to read.",
  "not-a-feed":
    "Couldn't find a news feed at that address. Try the site's RSS feed URL.",
};

/** Resolves what the user pasted to a feed, stores it (once across all circles), and follows it from this circle. */
export async function addCircleNewsSource({
  circleId,
  userId,
  url,
}: {
  circleId: string;
  userId: string;
  url: string;
}): Promise<NewsSourceDto> {
  const count = await prismaClient.circleNewsSource.count({
    where: { circleId },
  });
  if (count >= MAX_SOURCES_PER_CIRCLE) {
    throw new ApiError(
      400,
      `A circle can follow up to ${MAX_SOURCES_PER_CIRCLE} sources.`,
    );
  }

  let resolved;
  try {
    resolved = await resolveFeed(url);
  } catch (err) {
    if (err instanceof FeedError)
      throw new ApiError(400, FEED_ERROR_MESSAGES[err.code]);
    throw err;
  }

  // The poller's hourly prune deletes feeds nobody follows, and could do so between
  // finding a feed and following it; that shows up as one of these, so try again.
  for (let attempt = 0; ; attempt++) {
    try {
      return await followFeed({ circleId, userId, resolved, now: new Date() });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError)) throw err;
      const target = String(err.meta?.target ?? "");
      if (err.code === "P2002" && !target.includes("url")) {
        throw new ApiError(409, "This circle already follows that source.");
      }
      const raced =
        err.code === "P2003" || // the feed was pruned before the follow was written
        err.code === "P2025" || // ...or before its backoff reset
        err.code === "P2002"; // another request created the same feed first
      if (!raced || attempt >= 2) throw err;
    }
  }
}

async function followFeed({
  circleId,
  userId,
  resolved,
  now,
}: {
  circleId: string;
  userId: string;
  resolved: ResolvedFeed;
  now: Date;
}): Promise<NewsSourceDto> {
  const { feed: parsed } = resolved;
  const toDto = (
    feed: {
      id: string;
      url: string;
      title: string;
      siteUrl: string | null;
      imageUrl: string | null;
    },
    source: { addedById: string | null; createdAt: Date },
  ): NewsSourceDto => ({
    feedId: feed.id,
    url: feed.url,
    title: feed.title,
    siteUrl: feed.siteUrl,
    imageUrl: feed.imageUrl,
    addedById: source.addedById,
    createdAt: source.createdAt.toISOString(),
    canRemove: true,
  });

  const existing = await prismaClient.newsFeed.findUnique({
    where: { url: resolved.url },
  });
  if (existing) {
    // Stories stay with the poller, so its new ones reach every following circle live.
    // The feed was just fetched successfully, so any failure backoff left from earlier is stale.
    const [, source] = await prismaClient.$transaction([
      prismaClient.newsFeed.update({
        where: { id: existing.id },
        data: {
          failureCount: 0,
          nextFetchAt: existing.nextFetchAt > now ? now : existing.nextFetchAt,
        },
      }),
      prismaClient.circleNewsSource.create({
        data: { circleId, feedId: existing.id, addedById: userId },
      }),
    ]);
    return toDto(existing, source);
  }

  // A brand-new feed is created, seeded, and followed in one write.
  const feed = await prismaClient.newsFeed.create({
    data: {
      url: resolved.url,
      title: parsed.title || new URL(resolved.url).hostname,
      siteUrl: parsed.siteUrl,
      imageUrl: parsed.imageUrl,
      ttlMinutes: parsed.ttlMinutes,
      etag: resolved.etag,
      lastModified: resolved.lastModified,
      lastFetchedAt: now,
      nextFetchAt: new Date(
        now.getTime() +
          nextFetchDelayMinutes({
            ttlMinutes: parsed.ttlMinutes,
            failureCount: 0,
          }) *
            60_000,
      ),
      items: {
        create: selectFreshItems(parsed.items, now).map((item) => ({
          guid: item.guid,
          title: item.title,
          link: item.link,
          summary: item.summary,
          imageUrl: item.imageUrl,
          publishedAt:
            item.publishedAt && item.publishedAt < now ? item.publishedAt : now,
          createdAt: now,
        })),
      },
      sources: { create: { circleId, addedById: userId } },
    },
    include: { sources: { where: { circleId } } },
  });
  return toDto(feed, feed.sources[0]);
}

/** Whoever added a source, or the circle's creator, can remove it. */
export async function removeCircleNewsSource({
  circleId,
  feedId,
  userId,
}: {
  circleId: string;
  feedId: string;
  userId: string;
}) {
  const source = await prismaClient.circleNewsSource.findUnique({
    where: { circleId_feedId: { circleId, feedId } },
    select: { addedById: true, circle: { select: { userId: true } } },
  });
  if (!source) throw new ApiError(404);
  if (source.addedById !== userId && source.circle.userId !== userId) {
    throw new ApiError(403);
  }
  await prismaClient.circleNewsSource.delete({
    where: { circleId_feedId: { circleId, feedId } },
  });
}

/**
 * The registrable domain a hostname belongs to, using the Public Suffix List
 * including private suffixes, so each *.github.io or *.substack.com site
 * counts as its own site.
 */
export function siteOf(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return getDomain(host, { allowPrivateDomains: true }) ?? host;
}

function hostSite(url: string) {
  try {
    return siteOf(new URL(url).hostname);
  } catch {
    return null;
  }
}

/**
 * Preview fields for a link that is a stored news story, so shared stories
 * preview with their real headline and image (Google News links don't, when
 * scraped). Only stories from feeds the viewer's circle follows are used, and
 * only for links on the site the feed was fetched from, so a self-hosted feed
 * can't put a fake headline on another site's URL anywhere else.
 */
export async function getNewsLinkPreview({
  url,
  topicId,
  userId,
}: {
  url: string;
  topicId: string;
  userId: string;
}) {
  const site = hostSite(url);
  if (!site) return null;
  const topic = await prismaClient.topic.findFirst({
    where: { id: topicId, parentCircle: { members: { some: { id: userId } } } },
    select: { circleId: true },
  });
  if (!topic) return null;
  const items = await prismaClient.newsItem.findMany({
    where: {
      link: url,
      publishedAt: { gte: storyCutoff(new Date()) },
      expiredAt: null,
      feed: { sources: { some: { circleId: topic.circleId } } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      title: true,
      summary: true,
      imageUrl: true,
      feed: { select: { title: true, url: true } },
    },
  });
  const item = items.find((i) => hostSite(i.feed.url) === site);
  if (!item) return null;
  return {
    ogSiteName: item.feed.title,
    ogTitle: item.title,
    ogDescription: item.summary ?? undefined,
    ogImage: item.imageUrl ?? undefined,
  };
}

export type ShareTopicsResponse = {
  topics: { id: string; name: string }[];
  defaultTopicId: string | null;
};

/** The circle's topics for the share picker; read when it opens, since topics change after page load. */
export async function getShareTopics({
  circleId,
  userId,
}: {
  circleId: string;
  userId: string;
}): Promise<ShareTopicsResponse> {
  const [topics, circle] = await Promise.all([
    prismaClient.topic.getAllForCircleAndUser({
      userId,
      circleId,
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prismaClient.circle.getByIdForUser({
      userId,
      circleId,
      select: { defaultTopicId: true },
    }),
  ]);
  return {
    topics: (topics ?? []).map((t) => ({ id: t.id, name: t.name })),
    defaultTopicId: circle?.defaultTopicId ?? null,
  };
}
