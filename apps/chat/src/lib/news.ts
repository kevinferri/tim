import {
  FeedError,
  MAX_ITEMS_PER_FETCH,
  nextFetchDelayMinutes,
  resolveFeed,
  toNewsItemDto,
  type NewsItemDto,
} from "@tim/news";
import { Prisma } from "@prisma/client";
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
  if (feedIds.length === 0) return { sources, items: [], nextCursor: null };

  const after = cursor ? decodeCursor(cursor) : null;
  const rows = await prismaClient.newsItem.findMany({
    where: {
      feedId: { in: feedIds },
      ...(after && {
        OR: [
          { publishedAt: { lt: after.publishedAt } },
          { publishedAt: after.publishedAt, id: { lt: after.id } },
        ],
      }),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
  });
  const page = rows.slice(0, PAGE_SIZE);
  return {
    sources,
    items: page.map(toNewsItemDto),
    nextCursor:
      rows.length > PAGE_SIZE ? encodeCursor(page[page.length - 1]) : null,
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

  const now = new Date();
  const { feed: parsed } = resolved;
  const feed = await prismaClient.newsFeed.upsert({
    where: { url: resolved.url },
    create: {
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
    },
    update: {},
  });

  await prismaClient.newsItem.createMany({
    data: parsed.items.slice(0, MAX_ITEMS_PER_FETCH).map((item) => ({
      feedId: feed.id,
      guid: item.guid,
      title: item.title,
      link: item.link,
      summary: item.summary,
      imageUrl: item.imageUrl,
      publishedAt:
        item.publishedAt && item.publishedAt < now ? item.publishedAt : now,
      createdAt: now,
    })),
    skipDuplicates: true,
  });

  let source;
  try {
    source = await prismaClient.circleNewsSource.create({
      data: { circleId, feedId: feed.id, addedById: userId },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ApiError(409, "This circle already follows that source.");
    }
    throw err;
  }

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

/** Preview fields for a link that is a stored news story, so shared stories preview with their real headline and image (Google News links don't, when scraped). */
export async function getNewsLinkPreview(url: string) {
  const item = await prismaClient.newsItem.findFirst({
    where: { link: url },
    orderBy: { createdAt: "desc" },
    select: {
      title: true,
      summary: true,
      imageUrl: true,
      feed: { select: { title: true } },
    },
  });
  if (!item) return null;
  return {
    ogSiteName: item.feed.title,
    ogTitle: item.title,
    ogDescription: item.summary ?? undefined,
    ogImage: item.imageUrl ?? undefined,
  };
}
