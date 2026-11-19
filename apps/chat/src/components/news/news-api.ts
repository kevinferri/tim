import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { NewsItemDto } from "@tim/news";
import type { NewsResponse, NewsSourceDto } from "@/lib/news";

export type { NewsItemDto, NewsResponse, NewsSourceDto };

export type NewsCache = InfiniteData<NewsResponse, string | null>;

/** feedId null = every source the circle follows. */
export const newsQueryKey = (circleId: string, feedId: string | null = null) =>
  ["news", circleId, feedId] as const;

export async function fetchNews({
  circleId,
  feedId,
  cursor,
}: {
  circleId: string;
  feedId: string | null;
  cursor: string | null;
}): Promise<NewsResponse> {
  const params = new URLSearchParams();
  if (feedId) params.set("feedId", feedId);
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/circles/${circleId}/news?${params}`);
  if (!res.ok) throw new Error("Couldn't load news");
  return res.json();
}

async function errorMessage(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
}

export async function addNewsSource(circleId: string, url: string) {
  const res = await fetch(`/api/circles/${circleId}/news/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok)
    throw new Error(await errorMessage(res, "Couldn't add that source."));
  return ((await res.json()) as { source: NewsSourceDto }).source;
}

export async function removeNewsSource(circleId: string, feedId: string) {
  const res = await fetch(`/api/circles/${circleId}/news/sources/${feedId}`, {
    method: "DELETE",
  });
  if (!res.ok)
    throw new Error(await errorMessage(res, "Couldn't remove that source."));
}

/** Feed order: newest published first, then by id, matching the API's paging. */
function sortsBefore(a: NewsItemDto, b: NewsItemDto) {
  return a.publishedAt !== b.publishedAt
    ? a.publishedAt > b.publishedAt
    : a.id > b.id;
}

/**
 * Puts live items into loaded pages in feed order. A story can be stored now
 * but dated earlier than what's on screen (e.g. a Google News result from
 * yesterday); one older than every loaded story is left for "Load older
 * stories" to return, so it never shows twice. Returns null when nothing changed.
 */
export function mergeLiveItems(
  pages: NewsResponse[],
  items: NewsItemDto[],
): NewsResponse[] | null {
  if (pages.length === 0) return null;
  // By link too: a story re-stored after pruning or a feed's guid change gets a new id.
  const known = new Set(
    pages.flatMap((p) =>
      p.items.flatMap((i) => [i.id, `${i.feedId} ${i.link}`]),
    ),
  );
  const added = items.filter(
    (i) => !known.has(i.id) && !known.has(`${i.feedId} ${i.link}`),
  );
  if (added.length === 0) return null;

  const hasOlder = pages[pages.length - 1].nextCursor !== null;
  const next = pages.map((p) => ({ ...p, items: [...p.items] }));
  let changed = false;
  for (const item of added) {
    let index = next.findIndex(
      (p) =>
        p.items.length > 0 && sortsBefore(item, p.items[p.items.length - 1]),
    );
    if (index === -1) {
      if (hasOlder) continue;
      index = next.length - 1;
    }
    const list = next[index].items;
    const at = list.findIndex((x) => sortsBefore(item, x));
    list.splice(at === -1 ? list.length : at, 0, item);
    changed = true;
  }
  return changed ? next : null;
}

/** Live items that would land above everything currently listed (all of them when nothing is). */
export function newerThanListed(
  pages: NewsResponse[] | undefined,
  items: NewsItemDto[],
): NewsItemDto[] {
  const first = pages?.[0]?.items[0];
  return first ? items.filter((i) => sortsBefore(i, first)) : items;
}

/** Adds live items to every cached view of the circle's feed they belong in. */
export function prependNewsItems(
  queryClient: QueryClient,
  circleId: string,
  items: NewsItemDto[],
) {
  for (const [key, data] of queryClient.getQueriesData<NewsCache>({
    queryKey: ["news", circleId],
  })) {
    if (!data?.pages.length) continue;
    const feedId = key[2] as string | null;
    const pages = mergeLiveItems(
      data.pages,
      items.filter((i) => feedId === null || i.feedId === feedId),
    );
    if (pages) queryClient.setQueryData<NewsCache>(key, { ...data, pages });
  }
}

/** Suggested sources, mixed across subjects. URLs are the feeds' final addresses, so they match what a followed source stores. */
export const NEWS_PRESETS: { name: string; url: string }[] = [
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml" },
  { name: "ESPN", url: "https://www.espn.com/espn/rss/news" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  {
    name: "New York Times",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  },
  { name: "The Athletic", url: "https://www.nytimes.com/athletic/rss/news/" },
  { name: "Variety", url: "https://variety.com/feed/" },
  { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml" },
  { name: "Wired", url: "https://www.wired.com/feed/rss" },
  { name: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/" },
  { name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { name: "Pitchfork", url: "https://pitchfork.com/feed/feed-news/rss" },
  { name: "Axios", url: "https://api.axios.com/feed/" },
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
  },
  { name: "Yahoo Sports", url: "https://sports.yahoo.com/rss/" },
  { name: "Polygon", url: "https://www.polygon.com/feed/" },
  { name: "Politico", url: "https://rss.politico.com/politics-news.xml" },
  {
    name: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
  },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  {
    name: "Bloomberg Markets",
    url: "https://www.bloomberg.com/feeds/markets/news.rss",
  },
  { name: "Hacker News", url: "https://hnrss.org/frontpage" },
  { name: "NASA", url: "https://www.nasa.gov/feed/" },
];

/** How many suggestions show at once; following one brings in the next. */
export const VISIBLE_PRESETS = 6;

export function googleNewsTopicUrl(topic: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(topic.trim())}&hl=en-US&gl=US&ceid=US:en`;
}

/** True for anything that reads as an address rather than words: a scheme, or a dotted host with no spaces. */
export function looksLikeUrl(value: string) {
  const v = value.trim();
  return /^https?:\/\//i.test(v) || /^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(v);
}
