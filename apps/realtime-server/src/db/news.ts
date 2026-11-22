import { randomUUID } from "crypto";
import type { NewsFeed, NewsItem } from "@tim/db-types";
import {
  REFRESH_THROTTLE_MINUTES,
  storyCutoff,
  type FeedItem,
} from "@tim/news";
import { pgClient } from "./client";

// How long a claimed feed stays out of other ticks' reach while its fetch runs.
const CLAIM_MINUTES = 2;

/**
 * Claims up to `limit` due feeds followed by one of `circleIds` with News on,
 * by pushing their nextFetchAt forward. SKIP LOCKED keeps two server instances
 * from fetching the same feed at once.
 */
export async function claimDueFeeds({
  now,
  limit,
  circleIds,
}: {
  now: Date;
  limit: number;
  circleIds: string[];
}): Promise<NewsFeed[]> {
  if (circleIds.length === 0) return [];
  const claimUntil = new Date(now.getTime() + CLAIM_MINUTES * 60_000);
  const { rows } = await pgClient.raw<{ rows: NewsFeed[] }>(
    `UPDATE news_feeds SET "nextFetchAt" = ?
     WHERE id IN (
       SELECT f.id FROM news_feeds f
       WHERE f."nextFetchAt" <= ?
         AND EXISTS (
           SELECT 1 FROM circle_news_sources s
           JOIN circles c ON c.id = s."circleId"
           WHERE s."feedId" = f.id AND c."newsEnabled" AND s."circleId" = ANY(?)
         )
       ORDER BY f."nextFetchAt"
       LIMIT ?
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [claimUntil, now, circleIds, limit],
  );
  return rows;
}

/**
 * Makes a News-on circle's feeds due now, skipping any fetched in the last
 * REFRESH_THROTTLE_MINUTES. Returns how many feeds are due because of it.
 */
export async function markCircleFeedsDue({
  circleId,
  now,
}: {
  circleId: string;
  now: Date;
}): Promise<number> {
  const fetchedSince = new Date(
    now.getTime() - REFRESH_THROTTLE_MINUTES * 60_000,
  );
  const { rowCount } = await pgClient.raw<{ rowCount: number | null }>(
    `UPDATE news_feeds SET "nextFetchAt" = LEAST("nextFetchAt", ?)
     WHERE ("lastFetchedAt" IS NULL OR "lastFetchedAt" < ?)
       AND id IN (
         SELECT s."feedId" FROM circle_news_sources s
         JOIN circles c ON c.id = s."circleId"
         WHERE s."circleId" = ? AND c."newsEnabled"
       )`,
    [now, fetchedSince, circleId],
  );
  return rowCount ?? 0;
}

/** Circles with someone in one of their topics right now. */
export async function getCircleIdsForTopics(
  topicIds: string[],
): Promise<string[]> {
  if (topicIds.length === 0) return [];
  const rows = await pgClient("topics")
    .distinct("circleId")
    .whereIn("id", topicIds);
  return rows.map((r: { circleId: string }) => r.circleId);
}

/**
 * Inserts items not seen before (by feed + guid) and returns only the new
 * rows. Callers pass what `selectFreshItems` picked: dated, and within the
 * story lifetime.
 */
export async function insertNewItems({
  feedId,
  items,
  now,
}: {
  feedId: string;
  items: (FeedItem & { publishedAt: Date })[];
  now: Date;
}): Promise<NewsItem[]> {
  if (items.length === 0) return [];
  return await pgClient<NewsItem>("news_items")
    .insert(
      items.map((item) => ({
        id: randomUUID(),
        feedId,
        guid: item.guid,
        title: item.title,
        link: item.link,
        summary: item.summary,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt,
        createdAt: now,
      })),
    )
    .onConflict(["feedId", "guid"])
    .ignore()
    .returning("*");
}

export async function updateFeedAfterFetch(
  feedId: string,
  fields: Partial<
    Pick<
      NewsFeed,
      | "siteUrl"
      | "imageUrl"
      | "etag"
      | "lastModified"
      | "lastFetchedAt"
      | "nextFetchAt"
    >
  >,
) {
  await pgClient<NewsFeed>("news_feeds").where({ id: feedId }).update(fields);
}

/** Circles that follow the feed and have News on, so they get its new stories. */
export async function getCircleIdsForFeed(feedId: string): Promise<string[]> {
  const rows = await pgClient("circle_news_sources")
    .join("circles", "circles.id", "circle_news_sources.circleId")
    .select("circle_news_sources.circleId")
    .where({
      "circle_news_sources.feedId": feedId,
      "circles.newsEnabled": true,
    });
  return rows.map((r: { circleId: string }) => r.circleId);
}

/**
 * A story is deleted at the end of its lifetime (STORY_LIFETIME_HOURS). It can't come back
 * as new, because nothing published before the cutoff is ever stored. Feeds
 * nobody follows are kept (they're tiny) and simply not polled.
 */
export async function pruneNews({ now }: { now: Date }) {
  await pgClient<NewsItem>("news_items")
    .where("publishedAt", "<", storyCutoff(now))
    .del();
}
