import type { InfiniteData } from "@tanstack/react-query";
import type { NewsItemDto } from "@tim/news/shared";
import type {
  NewsResponse,
  NewsSourceDto,
  ShareTopicsResponse,
} from "@/lib/news";
import type { NewsSourceRequest } from "@/lib/news-sources";

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

export async function fetchShareTopics(
  circleId: string,
): Promise<ShareTopicsResponse> {
  const res = await fetch(`/api/circles/${circleId}/news/topics`);
  if (!res.ok) throw new Error("Couldn't load topics");
  return res.json();
}

async function errorMessage(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
}

export async function addNewsSource(
  circleId: string,
  request: NewsSourceRequest,
) {
  const res = await fetch(`/api/circles/${circleId}/news/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok)
    throw new Error(await errorMessage(res, "Couldn't add that source."));
  return ((await res.json()) as { source: NewsSourceDto }).source;
}

export async function setNewsEnabled(circleId: string, enabled: boolean) {
  const res = await fetch(`/api/circles/${circleId}/news`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok)
    throw new Error(await errorMessage(res, "Couldn't update News."));
}

export async function removeNewsSource(circleId: string, feedId: string) {
  const res = await fetch(`/api/circles/${circleId}/news/sources/${feedId}`, {
    method: "DELETE",
  });
  if (!res.ok)
    throw new Error(await errorMessage(res, "Couldn't remove that source."));
}
