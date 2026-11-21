import { XMLParser } from "fast-xml-parser";

export type FeedItem = {
  guid: string;
  title: string;
  link: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
};

export type ParsedFeed = {
  title: string;
  siteUrl: string | null;
  imageUrl: string | null;
  /** The feed's own requested minimum refresh interval (RSS <ttl>), if any. */
  ttlMinutes: number | null;
  items: FeedItem[];
};

export class NotAFeedError extends Error {
  constructor() {
    super("Not an RSS or Atom feed");
  }
}

const SUMMARY_MAX = 280;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) =>
    [
      "item",
      "entry",
      "link",
      "media:content",
      "media:thumbnail",
      "enclosure",
    ].includes(name),
});

type Node = Record<string, unknown>;

function asNode(value: unknown): Node | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Node)
    : null;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  const node = asNode(value);
  if (node && "#text" in node) return text(node["#text"]);
  if (Array.isArray(value)) return text(value[0]);
  return "";
}

function attr(value: unknown, name: string): string {
  const node = asNode(Array.isArray(value) ? value[0] : value);
  const raw = node?.[`@_${name}`];
  return typeof raw === "string" ? raw.trim() : "";
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  pound: "£",
  euro: "€",
  copy: "©",
  reg: "®",
  trade: "™",
  middot: "·",
  bull: "•",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Plain-text summary from feed HTML: tags dropped, entities decoded, whitespace collapsed, truncated. */
export function toPlainText(html: string, max = SUMMARY_MAX): string {
  const plain = decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function firstImgSrc(html: string): string {
  return /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1] ?? "";
}

function httpUrl(raw: string, base?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(decodeEntities(raw), base);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mediaImage(node: Node): string {
  const group = asNode(node["media:group"]) ?? {};
  for (const source of [node, group]) {
    const thumb = attr(source["media:thumbnail"], "url");
    if (thumb) return thumb;
    for (const content of asArray(source["media:content"])) {
      const medium = attr(content, "medium");
      const type = attr(content, "type");
      const url = attr(content, "url");
      if (url && (medium === "image" || type.startsWith("image/") || !type)) {
        return url;
      }
    }
  }
  for (const enclosure of asArray(node["enclosure"])) {
    if (attr(enclosure, "type").startsWith("image/")) {
      return attr(enclosure, "url");
    }
  }
  return attr(node["itunes:image"], "href");
}

function finishItem(
  fields: {
    guid: string;
    title: string;
    link: string;
    html: string;
    /** HTML scanned for an <img> when the item names no image of its own. */
    imageHtml: string;
    image: string;
    date: string;
  },
  base: string | undefined,
): FeedItem | null {
  const link = httpUrl(fields.link, base);
  const title = toPlainText(fields.title, 500);
  if (!link || !title) return null;
  const summary = fields.html ? toPlainText(fields.html) : "";
  return {
    guid: fields.guid || link,
    title,
    link,
    // Some feeds (Google News) repeat the headline as the summary.
    summary: summary && !summary.startsWith(title) ? summary : null,
    imageUrl: httpUrl(fields.image || firstImgSrc(fields.imageHtml), link),
    publishedAt: parseDate(fields.date),
  };
}

function parseRss(channel: Node, items: unknown[]): ParsedFeed {
  const siteUrl = httpUrl(text(channel["link"]));
  const ttl = parseInt(text(channel["ttl"]), 10);
  return {
    title: feedTitle(text(channel["title"])),
    siteUrl,
    imageUrl: httpUrl(
      text(asNode(channel["image"])?.["url"]) ||
        attr(channel["itunes:image"], "href"),
      siteUrl ?? undefined,
    ),
    ttlMinutes: Number.isFinite(ttl) && ttl > 0 ? ttl : null,
    items: items
      .map(asNode)
      .filter((n): n is Node => n !== null)
      .map((item) => {
        const description = text(item["description"]);
        const content = text(item["content:encoded"]);
        return finishItem(
          {
            guid: text(item["guid"]),
            title: text(item["title"]),
            link: text(item["link"]),
            html: description || content,
            imageHtml: `${description} ${content}`,
            image: mediaImage(item),
            date: text(item["pubDate"]) || text(item["dc:date"]),
          },
          siteUrl ?? undefined,
        );
      })
      .filter((i): i is FeedItem => i !== null),
  };
}

function atomLink(links: unknown): string {
  const all = asArray(links).map(asNode).filter(Boolean) as Node[];
  const alternate =
    all.find((l) => !l["@_rel"] || l["@_rel"] === "alternate") ?? all[0];
  return alternate ? attr(alternate, "href") : "";
}

// Google News names topic feeds like `"Knicks" - Google News`.
function feedTitle(raw: string): string {
  const title = toPlainText(raw, 200);
  const topic = /^"(.+)" - Google News$/.exec(title)?.[1];
  return topic ? `${topic} · Google News` : title;
}

function parseAtom(feed: Node): ParsedFeed {
  const siteUrl = httpUrl(atomLink(feed["link"]));
  return {
    title: feedTitle(text(feed["title"])),
    siteUrl,
    imageUrl: httpUrl(
      text(feed["icon"]) || text(feed["logo"]),
      siteUrl ?? undefined,
    ),
    ttlMinutes: null,
    items: asArray(feed["entry"])
      .map(asNode)
      .filter((n): n is Node => n !== null)
      .map((entry) => {
        const summary = text(entry["summary"]);
        const content = text(entry["content"]);
        return finishItem(
          {
            guid: text(entry["id"]),
            title: text(entry["title"]),
            link: atomLink(entry["link"]),
            html: summary || content,
            imageHtml: `${summary} ${content}`,
            image: mediaImage(entry),
            date: text(entry["published"]) || text(entry["updated"]),
          },
          siteUrl ?? undefined,
        );
      })
      .filter((i): i is FeedItem => i !== null),
  };
}

/** Parses RSS 2.0, RSS 1.0 (RDF), or Atom. Throws NotAFeedError for anything else. */
export function parseFeed(xml: string): ParsedFeed {
  let doc: Node;
  try {
    doc = parser.parse(xml) as Node;
  } catch {
    throw new NotAFeedError();
  }

  const rss = asNode(doc["rss"]);
  const rssChannel = asNode(rss?.["channel"]);
  if (rssChannel) return parseRss(rssChannel, asArray(rssChannel["item"]));

  const rdf = asNode(doc["rdf:RDF"]);
  const rdfChannel = asNode(rdf?.["channel"]);
  if (rdf && rdfChannel) return parseRss(rdfChannel, asArray(rdf["item"]));

  const atom = asNode(doc["feed"]);
  if (atom) return parseAtom(atom);

  throw new NotAFeedError();
}

/** Feed URLs a page advertises with <link rel="alternate" type="application/rss+xml|atom+xml">. */
export function discoverFeedUrls(html: string, pageUrl: string): string[] {
  const urls: string[] = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/rel=["']?alternate/i.test(tag)) continue;
    if (!/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    const url = href ? httpUrl(href, pageUrl) : null;
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}
