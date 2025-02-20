import { LRUCache } from "lru-cache";

const cache = new LRUCache({
  max: 500, // Max cachable items
  ttl: 1000 * 60 * 5, // 5 minutes
});

export async function cacheQuery<T>(
  model: string,
  args: T,
  query: (args: T) => Promise<unknown>
): Promise<unknown> {
  const key = `${model}:${JSON.stringify(args)}`;

  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await query(args);

  if (result) {
    cache.set(key, result);
  }

  return result;
}

export function invalidateCache(model: string) {
  const keys = Array.from(cache.keys()) as string[];

  for (const key of keys) {
    if (key.startsWith(model)) {
      cache.delete(key);
    }
  }
}
