import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import {
  NotAFeedError,
  discoverFeedUrls,
  parseFeed,
  type ParsedFeed,
} from "./parse";

export type FeedErrorCode =
  "invalid-url" | "blocked" | "fetch-failed" | "too-large" | "not-a-feed";

export class FeedError extends Error {
  constructor(
    readonly code: FeedErrorCode,
    message: string = code,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const USER_AGENT = "TimNews/1.0 (feed reader)";

// Feed URLs come from users, so the server must never be pointed at itself or its private network.
const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

export function isPublicAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return isPublicAddress(mapped);
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) return !blocked.check(address, "ipv6");
  return false;
}

/** Accepts "bbc.com" or a full URL; only http(s). */
export function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2048) throw new FeedError("invalid-url");
  let url: URL;
  try {
    url = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
  } catch {
    throw new FeedError("invalid-url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FeedError("invalid-url");
  }
  if (url.username || url.password) throw new FeedError("invalid-url");
  url.hash = "";
  return url;
}

async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new FeedError("blocked");
  }
  let addresses: { address: string }[];
  try {
    addresses = isIP(host)
      ? [{ address: host }]
      : await lookup(host, { all: true });
  } catch {
    throw new FeedError("fetch-failed", `Couldn't resolve ${host}`);
  }
  if (
    addresses.length === 0 ||
    !addresses.every((a) => isPublicAddress(a.address))
  ) {
    throw new FeedError("blocked");
  }
}

async function readCapped(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (declared > MAX_BYTES) throw new FeedError("too-large");
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new FeedError("too-large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

type FetchResult =
  | { status: "not-modified"; url: string }
  | {
      status: "ok";
      url: string;
      body: string;
      contentType: string;
      etag: string | null;
      lastModified: string | null;
    };

/** GET with a public-host check on every redirect hop, a timeout, and a body size cap. */
export async function safeFetch(
  input: URL,
  cache: { etag?: string | null; lastModified?: string | null } = {},
): Promise<FetchResult> {
  let url = input;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept:
        "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5",
    };
    if (cache.etag) headers["If-None-Match"] = cache.etag;
    if (cache.lastModified) headers["If-Modified-Since"] = cache.lastModified;

    let res: Response;
    try {
      res = await fetch(url, {
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new FeedError("fetch-failed", `Couldn't reach ${url.hostname}`);
    }

    if (res.status >= 300 && res.status < 400 && res.status !== 304) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new FeedError("fetch-failed");
      url = normalizeUrl(new URL(location, url).toString());
      continue;
    }
    if (res.status === 304)
      return { status: "not-modified", url: url.toString() };
    if (!res.ok) {
      await res.body?.cancel();
      throw new FeedError(
        "fetch-failed",
        `${url.hostname} returned ${res.status}`,
      );
    }
    return {
      status: "ok",
      url: url.toString(),
      body: await readCapped(res),
      contentType: res.headers.get("content-type") ?? "",
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
    };
  }
  throw new FeedError("fetch-failed", "Too many redirects");
}

export type FetchFeedResult =
  | { status: "not-modified" }
  | {
      status: "ok";
      feed: ParsedFeed;
      etag: string | null;
      lastModified: string | null;
    };

/** Re-fetches a known feed URL, using the previous response's validators so unchanged feeds cost almost nothing. */
export async function fetchFeed(
  feedUrl: string,
  cache: { etag?: string | null; lastModified?: string | null } = {},
): Promise<FetchFeedResult> {
  const res = await safeFetch(normalizeUrl(feedUrl), cache);
  if (res.status === "not-modified") return res;
  try {
    return {
      status: "ok",
      feed: parseFeed(res.body),
      etag: res.etag,
      lastModified: res.lastModified,
    };
  } catch (err) {
    if (err instanceof NotAFeedError) throw new FeedError("not-a-feed");
    throw err;
  }
}

export type ResolvedFeed = {
  /** The feed's own URL after redirects, which is what gets stored and polled. */
  url: string;
  feed: ParsedFeed;
  etag: string | null;
  lastModified: string | null;
};

/** Turns whatever a user pasted (a feed URL or a site's address) into a parsed feed. */
export async function resolveFeed(input: string): Promise<ResolvedFeed> {
  const first = await safeFetch(normalizeUrl(input));
  if (first.status !== "ok") throw new FeedError("fetch-failed");

  try {
    return {
      url: first.url,
      feed: parseFeed(first.body),
      etag: first.etag,
      lastModified: first.lastModified,
    };
  } catch (err) {
    if (!(err instanceof NotAFeedError)) throw err;
  }

  for (const candidate of discoverFeedUrls(first.body, first.url).slice(0, 3)) {
    try {
      const res = await safeFetch(normalizeUrl(candidate));
      if (res.status !== "ok") continue;
      return {
        url: res.url,
        feed: parseFeed(res.body),
        etag: res.etag,
        lastModified: res.lastModified,
      };
    } catch (err) {
      if (err instanceof FeedError && err.code === "blocked") throw err;
    }
  }
  throw new FeedError("not-a-feed");
}
