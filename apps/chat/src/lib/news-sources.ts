// News sources a circle can follow: these presets, or a Google News topic. Shared by the News UI and the server, which only accepts these.

export type NewsSourceRequest = { preset: string } | { topic: string };

export const NEWS_PRESET_CATEGORIES = [
  "News",
  "Sports",
  "Tech",
  "Business",
  "Entertainment",
  "Gaming",
  "Science",
  "Food & culture",
] as const;

export type NewsPresetCategory = (typeof NEWS_PRESET_CATEGORIES)[number];

/** The sites a circle can follow besides topics. Each was checked to load, parse and update daily with the poller's own fetcher. */
export const NEWS_PRESETS: {
  name: string;
  url: string;
  category: NewsPresetCategory;
}[] = [
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    category: "News",
  },
  {
    name: "New York Times",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    category: "News",
  },
  { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", category: "News" },
  {
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
    category: "News",
  },
  { name: "Axios", url: "https://api.axios.com/feed/", category: "News" },
  {
    name: "Washington Post",
    url: "https://feeds.washingtonpost.com/rss/national",
    category: "News",
  },
  {
    name: "Politico",
    url: "https://rss.politico.com/politics-news.xml",
    category: "News",
  },
  { name: "The Hill", url: "https://thehill.com/feed/", category: "News" },
  {
    name: "ABC News",
    url: "https://abcnews.go.com/abcnews/topstories",
    category: "News",
  },
  {
    name: "CBS News",
    url: "https://www.cbsnews.com/latest/rss/main",
    category: "News",
  },
  {
    name: "NBC News",
    url: "https://feeds.nbcnews.com/nbcnews/public/news",
    category: "News",
  },
  {
    name: "The Atlantic",
    url: "https://www.theatlantic.com/feed/all/",
    category: "News",
  },
  {
    name: "The New Yorker",
    url: "https://www.newyorker.com/feed/everything",
    category: "News",
  },
  { name: "Vox", url: "https://www.vox.com/rss/index.xml", category: "News" },
  { name: "Semafor", url: "https://www.semafor.com/rss.xml", category: "News" },
  {
    name: "ProPublica",
    url: "https://feeds.propublica.org/propublica/main",
    category: "News",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    category: "News",
  },
  {
    name: "CBC News",
    url: "https://www.cbc.ca/webfeed/rss/rss-topstories",
    category: "News",
  },
  { name: "DW", url: "https://rss.dw.com/rdf/rss-en-all", category: "News" },
  {
    name: "France 24",
    url: "https://www.france24.com/en/rss",
    category: "News",
  },
  {
    name: "ABC Australia",
    url: "https://www.abc.net.au/news/feed/51120/rss.xml",
    category: "News",
  },
  {
    name: "ESPN",
    url: "https://now.core.api.espn.com/v1/sports/news?limit=50",
    category: "Sports",
  },
  {
    name: "The Athletic",
    url: "https://www.nytimes.com/athletic/rss/news/",
    category: "Sports",
  },
  {
    name: "CBS Sports",
    url: "https://www.cbssports.com/rss/headlines/",
    category: "Sports",
  },
  {
    name: "Yahoo Sports",
    url: "https://sports.yahoo.com/rss/",
    category: "Sports",
  },
  {
    name: "SB Nation",
    url: "https://www.sbnation.com/rss/index.xml",
    category: "Sports",
  },
  {
    name: "Sky Sports",
    url: "https://www.skysports.com/rss/12040",
    category: "Sports",
  },
  { name: "Defector", url: "https://defector.com/feed", category: "Sports" },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    category: "Tech",
  },
  { name: "Wired", url: "https://www.wired.com/feed/rss", category: "Tech" },
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    category: "Tech",
  },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Tech" },
  {
    name: "Engadget",
    url: "https://www.engadget.com/rss.xml",
    category: "Tech",
  },
  { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Tech" },
  { name: "9to5Mac", url: "https://9to5mac.com/feed/", category: "Tech" },
  {
    name: "MacRumors",
    url: "https://feeds.macrumors.com/MacRumors-All",
    category: "Tech",
  },
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    category: "Tech",
  },
  { name: "404 Media", url: "https://www.404media.co/rss/", category: "Tech" },
  {
    name: "Daring Fireball",
    url: "https://daringfireball.net/feeds/main",
    category: "Tech",
  },
  {
    name: "Product Hunt",
    url: "https://www.producthunt.com/feed",
    category: "Tech",
  },
  {
    name: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    category: "Business",
  },
  {
    name: "Bloomberg Markets",
    url: "https://www.bloomberg.com/feeds/markets/news.rss",
    category: "Business",
  },
  {
    name: "Financial Times",
    url: "https://www.ft.com/rss/home",
    category: "Business",
  },
  {
    name: "The Economist",
    url: "https://www.economist.com/latest/rss.xml",
    category: "Business",
  },
  {
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    category: "Business",
  },
  {
    name: "Business Insider",
    url: "https://feeds.businessinsider.com/custom/all",
    category: "Business",
  },
  { name: "Fortune", url: "https://fortune.com/feed/", category: "Business" },
  {
    name: "Variety",
    url: "https://variety.com/feed/",
    category: "Entertainment",
  },
  {
    name: "The Hollywood Reporter",
    url: "https://www.hollywoodreporter.com/feed/",
    category: "Entertainment",
  },
  {
    name: "Deadline",
    url: "https://deadline.com/feed/",
    category: "Entertainment",
  },
  {
    name: "Rolling Stone",
    url: "https://www.rollingstone.com/feed/",
    category: "Entertainment",
  },
  {
    name: "Billboard",
    url: "https://www.billboard.com/feed/",
    category: "Entertainment",
  },
  {
    name: "Pitchfork",
    url: "https://pitchfork.com/feed/feed-news/rss",
    category: "Entertainment",
  },
  {
    name: "Stereogum",
    url: "https://www.stereogum.com/feed/",
    category: "Entertainment",
  },
  {
    name: "Consequence",
    url: "https://consequence.net/feed/",
    category: "Entertainment",
  },
  { name: "Polygon", url: "https://www.polygon.com/feed/", category: "Gaming" },
  {
    name: "IGN",
    url: "https://feeds.feedburner.com/ign/all",
    category: "Gaming",
  },
  { name: "Kotaku", url: "https://kotaku.com/rss", category: "Gaming" },
  {
    name: "GameSpot",
    url: "https://www.gamespot.com/feeds/mashup/",
    category: "Gaming",
  },
  {
    name: "Eurogamer",
    url: "https://www.eurogamer.net/feed",
    category: "Gaming",
  },
  {
    name: "Nintendo Life",
    url: "https://www.nintendolife.com/feeds/latest",
    category: "Gaming",
  },
  { name: "NASA", url: "https://www.nasa.gov/feed/", category: "Science" },
  {
    name: "Space.com",
    url: "https://www.space.com/feeds/all",
    category: "Science",
  },
  {
    name: "Scientific American",
    url: "http://rss.sciam.com/ScientificAmerican-Global",
    category: "Science",
  },
  {
    name: "Nature",
    url: "https://www.nature.com/nature.rss",
    category: "Science",
  },
  {
    name: "Quanta Magazine",
    url: "https://www.quantamagazine.org/feed/",
    category: "Science",
  },
  {
    name: "ScienceDaily",
    url: "https://www.sciencedaily.com/rss/all.xml",
    category: "Science",
  },
  {
    name: "Eater",
    url: "https://www.eater.com/rss/index.xml",
    category: "Food & culture",
  },
  {
    name: "Bon Appétit",
    url: "https://www.bonappetit.com/feed/rss",
    category: "Food & culture",
  },
  {
    name: "Atlas Obscura",
    url: "https://www.atlasobscura.com/feeds/latest",
    category: "Food & culture",
  },
  {
    name: "Hypebeast",
    url: "https://hypebeast.com/feed",
    category: "Food & culture",
  },
  {
    name: "Kottke",
    url: "https://feeds.kottke.org/main",
    category: "Food & culture",
  },
  {
    name: "The Onion",
    url: "https://www.theonion.com/rss",
    category: "Food & culture",
  },
];

/** Shown before the viewer types anything. */
const POPULAR_PRESET_NAMES = [
  "BBC News",
  "New York Times",
  "ESPN",
  "The Verge",
  "The Athletic",
  "NPR",
  "Hacker News",
  "Variety",
];

const SUGGESTION_LIMIT = 8;

/**
 * Presets to offer for what the viewer typed, matched by name or subject; the
 * popular ones when nothing is typed. Ones already followed are left out.
 */
export function suggestPresets(query: string, followedUrls: Set<string>) {
  const q = cleanTopic(query).toLowerCase();
  const open = NEWS_PRESETS.filter((p) => !followedUrls.has(p.url));
  if (!q) {
    return open
      .filter((p) => POPULAR_PRESET_NAMES.includes(p.name))
      .slice(0, SUGGESTION_LIMIT);
  }
  // Name matches first (starts-with before contains), then subject matches.
  const rank = (p: (typeof NEWS_PRESETS)[number]) => {
    const name = p.name.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (p.category.toLowerCase().includes(q)) return 2;
    return -1;
  };
  return open
    .map((p) => ({ p, r: rank(p) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => a.r - b.r)
    .slice(0, SUGGESTION_LIMIT)
    .map(({ p }) => p);
}

/** The preset whose name is exactly what was typed, ignoring case, so Enter follows the site rather than a topic. */
export function exactPreset(query: string) {
  const q = cleanTopic(query).toLowerCase();
  return NEWS_PRESETS.find((p) => p.name.toLowerCase() === q) ?? null;
}

export const MAX_TOPIC_LENGTH = 80;

/** Trimmed, with runs of spaces collapsed; empty when there's nothing to follow. */
export function cleanTopic(topic: string) {
  return topic.trim().replace(/\s+/g, " ").slice(0, MAX_TOPIC_LENGTH);
}

/** Google News search ignores case, so topics that differ only in case share one feed. */
export function googleNewsTopicUrl(topic: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(cleanTopic(topic).toLowerCase())}&hl=en-US&gl=US&ceid=US:en`;
}

export function topicTitle(topic: string) {
  return `${cleanTopic(topic)} · Google News`;
}
