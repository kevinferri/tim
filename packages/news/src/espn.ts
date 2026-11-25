import {
  finishItem,
  NotAFeedError,
  type FeedItem,
  type ParsedFeed,
} from "./parse";

// ESPN's CDN serves its RSS feeds empty to datacenter IPs, but not this (unofficial) JSON API.
export const ESPN_NEWS_URL =
  "https://now.core.api.espn.com/v1/sports/news?limit=50";
const ESPN_API_HOST = new URL(ESPN_NEWS_URL).hostname;

// Game recaps and previews aren't in ESPN's top-news RSS feed.
const STORY_TYPES = new Set(["Story", "HeadlineNews"]);

export function isEspnNewsUrl(url: string): boolean {
  return new URL(url).hostname === ESPN_API_HOST;
}

type Headline = {
  id?: unknown;
  type?: unknown;
  headline?: unknown;
  description?: unknown;
  published?: unknown;
  links?: { web?: { href?: unknown } };
  images?: { url?: unknown }[];
};

const str = (value: unknown) => (typeof value === "string" ? value : "");

export function parseEspnNews(json: string): ParsedFeed {
  let headlines: unknown;
  try {
    headlines = (JSON.parse(json) as { headlines?: unknown }).headlines;
  } catch {
    throw new NotAFeedError();
  }
  if (!Array.isArray(headlines)) throw new NotAFeedError();
  return {
    title: "ESPN",
    siteUrl: "https://www.espn.com/",
    imageUrl:
      "https://a.espncdn.com/i/espn/teamlogos/lrg/trans/espn_dotcom_black.gif",
    items: (headlines as Headline[])
      .filter((h) => h && STORY_TYPES.has(str(h.type)))
      .map((h) =>
        finishItem(
          {
            // Matches the RSS feed's guids, so stories already stored aren't added again.
            guid: typeof h.id === "number" ? `US-EN-${h.id}` : "",
            title: str(h.headline),
            link: str(h.links?.web?.href),
            html: str(h.description),
            imageHtml: "",
            image: str(h.images?.[0]?.url),
            date: str(h.published),
          },
          undefined,
        ),
      )
      .filter((i): i is FeedItem => i !== null),
  };
}
