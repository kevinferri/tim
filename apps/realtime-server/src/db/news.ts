import { randomUUID } from "crypto";
import type { NewsFeed, NewsItem } from "@tim/db-types";
import { retentionCutoff, type FeedItem } from "@tim/news";
import { pgClient } from "./client";

// How long a claimed feed stays out of other ticks' reach while its fetch runs.
const CLAIM_MINUTES = 2;

/**
 * Claims up to `limit` due feeds that at least one circle still follows, by
 * pushing their nextFetchAt forward. SKIP LOCKED keeps two server instances
 * from fetching the same feed at once.
 */
export async function claimDueFeeds({
  now,
  limit,
}: {
  now: Date;
  limit: number;
}): Promise<NewsFeed[]> {
  const claimUntil = new Date(now.getTime() + CLAIM_MINUTES * 60_000);
  const { rows } = await pgClient.raw<{ rows: NewsFeed[] }>(
    `UPDATE news_feeds SET "nextFetchAt" = ?
     WHERE id IN (
       SELECT f.id FROM news_feeds f
       WHERE f."nextFetchAt" <= ?
         AND EXISTS (SELECT 1 FROM circle_news_sources s WHERE s."feedId" = f.id)
       ORDER BY f."nextFetchAt"
       LIMIT ?
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [claimUntil, now, limit],
  );
  return rows;
}

/**
 * Inserts items not seen before (by feed + guid) and returns only the new rows.
 * Stories dated before the retention window are skipped: they're old news,
 * and one pruned long ago shouldn't come back as "new".
 */
export async function insertNewItems({
  feedId,
  items,
  now,
}: {
  feedId: string;
  items: FeedItem[];
  now: Date;
}): Promise<NewsItem[]> {
  const cutoff = retentionCutoff(now);
  const fresh = items.filter((i) => !i.publishedAt || i.publishedAt >= cutoff);
  if (fresh.length === 0) return [];
  return await pgClient<NewsItem>("news_items")
    .insert(
      fresh.map((item) => ({
        id: randomUUID(),
        feedId,
        guid: item.guid,
        title: item.title,
        link: item.link,
        summary: item.summary,
        imageUrl: item.imageUrl,
        // A future date would pin the item to the top of every feed.
        publishedAt:
          item.publishedAt && item.publishedAt < now ? item.publishedAt : now,
        createdAt: now,
        lastSeenAt: now,
      })),
    )
    .onConflict(["feedId", "guid"])
    .ignore()
    .returning("*");
}

/** Records that the feed still lists these stories (all of them when `guids` is omitted, i.e. a 304). */
export async function markItemsSeen({
  feedId,
  guids,
  now,
}: {
  feedId: string;
  guids?: string[];
  now: Date;
}) {
  const query = pgClient<NewsItem>("news_items").where({ feedId });
  if (guids) {
    if (guids.length === 0) return;
    query.whereIn("guid", guids);
  }
  await query.update({ lastSeenAt: now });
}

export async function updateFeedAfterFetch(
  feedId: string,
  fields: Partial<
    Pick<
      NewsFeed,
      | "title"
      | "siteUrl"
      | "imageUrl"
      | "ttlMinutes"
      | "etag"
      | "lastModified"
      | "lastFetchedAt"
      | "nextFetchAt"
      | "failureCount"
    >
  >,
) {
  await pgClient<NewsFeed>("news_feeds").where({ id: feedId }).update(fields);
}

export async function getCircleIdsForFeed(feedId: string): Promise<string[]> {
  const rows = await pgClient("circle_news_sources")
    .select("circleId")
    .where({ feedId });
  return rows.map((r: { circleId: string }) => r.circleId);
}

/**
 * Drops stories the feed stopped listing before `before`, and feeds no circle
 * follows anymore. A story the feed still lists is kept, however old, so it
 * can't be re-inserted and pushed again as new.
 */
export async function pruneNews({ before }: { before: Date }) {
  await pgClient<NewsItem>("news_items").where("lastSeenAt", "<", before).del();
  await pgClient("news_feeds")
    .whereNotExists(
      pgClient("circle_news_sources")
        .select(pgClient.raw("1"))
        .whereRaw('circle_news_sources."feedId" = news_feeds.id'),
    )
    .del();
}
