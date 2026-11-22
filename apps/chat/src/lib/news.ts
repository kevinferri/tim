import { storyCutoff, toNewsItemDto, type NewsItemDto } from "@tim/news/shared";
import { Prisma } from "@prisma/client";
import { getDomain } from "tldts";
import { prismaClient } from "@/lib/prisma/client";
import { ApiError } from "@/lib/api";
import {
  NEWS_PRESETS,
  cleanTopic,
  googleNewsTopicUrl,
  topicTitle,
  type NewsSourceRequest,
} from "@/lib/news-sources";

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
  /** Off by default; while off, nothing is listed or polled. */
  enabled: boolean;
  /** The circle's creator, the only one who can turn News on or off. */
  isAdmin: boolean;
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
    select: { userId: true, newsEnabled: true },
  });
  const isCreator = circle?.userId === userId;
  const enabled = circle?.newsEnabled ?? false;
  const empty = { items: [], nextCursor: null, newestCreatedAt: null };
  if (!enabled) {
    return { enabled, isAdmin: isCreator, sources: [], ...empty };
  }
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
    return { enabled, isAdmin: isCreator, sources, ...empty };
  }

  const live = {
    feedId: { in: feedIds },
    // The feed hosts a story for 24 hours; this hides it on time even before the poller deletes it.
    publishedAt: { gte: storyCutoff(new Date()) },
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
    enabled,
    isAdmin: isCreator,
    sources,
    items: page.map(toNewsItemDto),
    nextCursor:
      rows.length > PAGE_SIZE ? encodeCursor(page[page.length - 1]) : null,
    newestCreatedAt: newest._max.createdAt?.toISOString() ?? null,
  };
}

/** Only presets and Google News topics can be followed, so the server builds every feed URL itself. */
export function feedForSourceRequest(request: NewsSourceRequest): {
  url: string;
  title: string;
} {
  if ("preset" in request) {
    const preset = NEWS_PRESETS.find((p) => p.url === request.preset);
    if (!preset) throw new ApiError(400, "That isn't one of the sources.");
    return { url: preset.url, title: preset.name };
  }
  if (!cleanTopic(request.topic)) throw new ApiError(400, "Enter a topic.");
  return {
    url: googleNewsTopicUrl(request.topic),
    title: topicTitle(request.topic),
  };
}

/**
 * Follows a feed from this circle, creating it (once across all circles) if
 * it's new. Nothing is fetched here: the browser asks the realtime server to
 * refresh the circle next, and its poller stores and pushes the stories.
 */
export async function addCircleNewsSource({
  circleId,
  userId,
  url,
  title,
}: {
  circleId: string;
  userId: string;
  url: string;
  title: string;
}): Promise<NewsSourceDto> {
  const [circle, count] = await Promise.all([
    prismaClient.circle.findUnique({
      where: { id: circleId },
      select: { newsEnabled: true },
    }),
    prismaClient.circleNewsSource.count({ where: { circleId } }),
  ]);
  if (!circle?.newsEnabled) throw new ApiError(400, "News is off.");
  if (count >= MAX_SOURCES_PER_CIRCLE) {
    throw new ApiError(
      400,
      `A circle can follow up to ${MAX_SOURCES_PER_CIRCLE} sources.`,
    );
  }

  // Feeds are never deleted, so the feed can be found or created first, then followed.
  const feed = await prismaClient.newsFeed.upsert({
    where: { url },
    create: { url, title },
    update: {},
  });
  try {
    const source = await prismaClient.circleNewsSource.create({
      data: { circleId, feedId: feed.id, addedById: userId },
    });
    return {
      feedId: feed.id,
      url: feed.url,
      title: feed.title,
      siteUrl: feed.siteUrl,
      imageUrl: feed.imageUrl,
      addedById: source.addedById,
      createdAt: source.createdAt.toISOString(),
      canRemove: true,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ApiError(409, "This circle already follows that source.");
    }
    throw err;
  }
}

/** Caller must have checked the user is the circle's creator. Turning News off keeps its sources. */
export async function setNewsEnabled({
  circleId,
  userId,
  enabled,
}: {
  circleId: string;
  userId: string;
  enabled: boolean;
}) {
  const { count } = await prismaClient.circle.updateMany({
    where: { id: circleId, userId },
    data: { newsEnabled: enabled },
  });
  if (count === 0) throw new ApiError(403);
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
