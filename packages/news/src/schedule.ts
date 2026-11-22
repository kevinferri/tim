import type { FeedItem } from "./parse";

/** Newest items kept from one fetch; feeds can list hundreds and only the latest matter. */
export const MAX_ITEMS_PER_FETCH = 50;

/** Background poll interval, for feeds of circles with News on and someone connected. Also the retry delay after a failure. */
export const POLL_INTERVAL_MINUTES = 60;

/** A circle opening News (or the circle) refetches its feeds, but no feed more often than this. */
export const REFRESH_THROTTLE_MINUTES = 15;

/** How long the feed hosts a story, counted from its publish date. */
export const STORY_LIFETIME_HOURS = 24;

/** Stories published before this have expired: they're hidden, deleted, and never stored. */
export function storyCutoff(now: Date): Date {
  return new Date(now.getTime() - STORY_LIFETIME_HOURS * 60 * 60_000);
}

// Tolerates small clock differences; anything dated further ahead would sit at the top of every feed.
const MAX_FUTURE_MS = 10 * 60_000;

/**
 * The stories worth storing from one fetch: dated within the story lifetime,
 * one per guid, newest first, at most MAX_ITEMS_PER_FETCH. Feeds aren't always
 * newest-first (Google News search feeds are ranked by relevance), so this
 * sorts before cutting. Undated stories are skipped: since nothing older than
 * the cutoff is ever stored, deleting a story at the cutoff can't make it come
 * back as new, but an undated one would.
 */
export function selectFreshItems(
  items: FeedItem[],
  now: Date,
): (FeedItem & { publishedAt: Date })[] {
  const cutoff = storyCutoff(now);
  const latest = now.getTime() + MAX_FUTURE_MS;
  const seen = new Set<string>();
  return items
    .filter((item): item is FeedItem & { publishedAt: Date } => {
      if (!item.publishedAt || seen.has(item.guid)) return false;
      seen.add(item.guid);
      return item.publishedAt >= cutoff && item.publishedAt.getTime() <= latest;
    })
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_ITEMS_PER_FETCH);
}
