import { lookup as dnsLookup } from "node:dns";
import http, { type IncomingHttpHeaders } from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { isEspnNewsUrl, parseEspnNews } from "./espn";
import { NotAFeedError, parseFeed, type ParsedFeed } from "./parse";

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

/**
 * dns.lookup that fails unless every answer is public. It's passed to the
 * request as its own lookup, so the address checked is the one connected to
 * (a separate pre-flight lookup could be answered differently: DNS rebinding).
 */
export const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    if (
      addresses.length === 0 ||
      !addresses.every((a) => isPublicAddress(a.address))
    ) {
      return callback(
        Object.assign(new Error(`${hostname} is not a public address`), {
          code: "EBLOCKED",
        }),
        "",
      );
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

// Requests to an IP literal skip lookup entirely, so those are checked here.
function assertHostAllowed(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new FeedError("blocked");
  }
  if (isIP(host) && !isPublicAddress(host)) throw new FeedError("blocked");
}

type RawResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  body: string | null;
};

function header(headers: IncomingHttpHeaders, name: string): string | null {
  const value = headers[name];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function getOnce(
  url: URL,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const host = url.hostname;
    if (signal?.aborted) {
      reject(new FeedError("fetch-failed", `${host} timed out`));
      return;
    }
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      url,
      { method: "GET", headers, lookup: publicLookup, signal },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          res.resume();
          resolve({ status, headers: res.headers, body: null });
          return;
        }
        if (Number(header(res.headers, "content-length")) > MAX_BYTES) {
          req.destroy(new FeedError("too-large"));
          return;
        }
        const encoding = header(res.headers, "content-encoding");
        const stream: NodeJS.ReadableStream =
          encoding === "gzip"
            ? res.pipe(zlib.createGunzip())
            : encoding === "deflate"
              ? res.pipe(zlib.createInflate())
              : encoding === "br"
                ? res.pipe(zlib.createBrotliDecompress())
                : res;
        const chunks: Buffer[] = [];
        let total = 0;
        stream.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_BYTES) {
            req.destroy(new FeedError("too-large"));
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () =>
          resolve({
            status,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        stream.on("error", () =>
          reject(new FeedError("fetch-failed", `Couldn't read ${host}`)),
        );
      },
    );
    const deadline = setTimeout(
      () => req.destroy(new FeedError("fetch-failed", `${host} timed out`)),
      TIMEOUT_MS,
    );
    req.on("close", () => clearTimeout(deadline));
    req.on("error", (err: NodeJS.ErrnoException) => {
      if (err instanceof FeedError) reject(err);
      else if (err.name === "AbortError")
        reject(new FeedError("fetch-failed", `${host} timed out`));
      else if (err.code === "EBLOCKED") reject(new FeedError("blocked"));
      else reject(new FeedError("fetch-failed", `Couldn't reach ${host}`));
    });
    req.end();
  });
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

/** GET that only ever connects to public addresses (every redirect hop included), with a timeout and a body size cap. */
export async function safeFetch(
  input: URL,
  cache: { etag?: string | null; lastModified?: string | null } = {},
  signal?: AbortSignal,
): Promise<FetchResult> {
  let url = input;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertHostAllowed(url);
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept:
        "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
    };
    if (cache.etag) headers["If-None-Match"] = cache.etag;
    if (cache.lastModified) headers["If-Modified-Since"] = cache.lastModified;

    const res = await getOnce(url, headers, signal);

    if (res.status >= 300 && res.status < 400 && res.status !== 304) {
      const location = header(res.headers, "location");
      if (!location) throw new FeedError("fetch-failed");
      url = normalizeUrl(new URL(location, url).toString());
      continue;
    }
    if (res.status === 304)
      return { status: "not-modified", url: url.toString() };
    if (res.body === null) {
      throw new FeedError(
        "fetch-failed",
        `${url.hostname} returned ${res.status}`,
      );
    }
    return {
      status: "ok",
      url: url.toString(),
      body: res.body,
      contentType: header(res.headers, "content-type") ?? "",
      etag: header(res.headers, "etag"),
      lastModified: header(res.headers, "last-modified"),
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

export function parserFor(url: string): (body: string) => ParsedFeed {
  return isEspnNewsUrl(url) ? parseEspnNews : parseFeed;
}

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
      feed: parserFor(res.url)(res.body),
      etag: res.etag,
      lastModified: res.lastModified,
    };
  } catch (err) {
    if (err instanceof NotAFeedError)
      throw new FeedError("not-a-feed", describeNonFeed(res));
    throw err;
  }
}

// So the log shows what a 2xx non-feed actually was (a bot-check page, an empty body, a redirect elsewhere).
export function describeNonFeed(res: {
  url: string;
  contentType: string;
  body: string;
}): string {
  const start = res.body.trim().replace(/\s+/g, " ").slice(0, 120);
  return `${res.contentType || "no content-type"}, ${res.body.length} bytes from ${res.url}: ${JSON.stringify(start)}`;
}
