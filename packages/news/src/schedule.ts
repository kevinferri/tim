import type { FeedItem } from "./parse";

const BASE_MINUTES = 5;
const MAX_TTL_MINUTES = 60;
const MAX_BACKOFF_MINUTES = 6 * 60;

/** Newest items kept from one fetch; feeds can list hundreds and only the latest matter. */
export const MAX_ITEMS_PER_FETCH = 50;

/**
 * Minutes until a feed is due again. Honors the feed's own <ttl> (capped so a
 * huge one can't stall it), and backs off exponentially while fetches fail.
 */
export function nextFetchDelayMinutes({
  ttlMinutes,
  failureCount,
}: {
  ttlMinutes: number | null;
  failureCount: number;
}): number {
  if (failureCount > 0) {
    return Math.min(BASE_MINUTES * 2 ** failureCount, MAX_BACKOFF_MINUTES);
  }
  return Math.max(BASE_MINUTES, Math.min(ttlMinutes ?? 0, MAX_TTL_MINUTES));
}

/** How long the feed hosts a story, counted from its publish date (or when first seen, if undated). */
export const STORY_LIFETIME_HOURS = 24;

/** Stories published before this have expired: they're hidden, their content is deleted, and they're never stored. */
export function storyCutoff(now: Date): Date {
  return new Date(now.getTime() - STORY_LIFETIME_HOURS * 60 * 60_000);
}

/**
 * An expired story keeps an empty "already seen" row while its feed still
 * lists it, so it can't be stored again as new. The row goes once the feed
 * has stopped listing it for this long.
 */
export const SEEN_MARKER_DAYS = 7;

export function seenMarkerCutoff(now: Date): Date {
  return new Date(now.getTime() - SEEN_MARKER_DAYS * 24 * 60 * 60_000);
}

/**
 * The stories worth storing from one fetch: unexpired, one per guid, newest
 * first, at most MAX_ITEMS_PER_FETCH. Feeds aren't always newest-first
 * (Google News search feeds are ranked by relevance), so this sorts before
 * cutting. Undated stories count as published now.
 */
export function selectFreshItems(items: FeedItem[], now: Date): FeedItem[] {
  const cutoff = storyCutoff(now);
  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (seen.has(item.guid)) return false;
      seen.add(item.guid);
      return !item.publishedAt || item.publishedAt >= cutoff;
    })
    .sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? now.getTime()) -
        (a.publishedAt?.getTime() ?? now.getTime()),
    )
    .slice(0, MAX_ITEMS_PER_FETCH);
}
