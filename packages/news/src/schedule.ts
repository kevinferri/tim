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
