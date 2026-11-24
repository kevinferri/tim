import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FeedError,
  isPublicAddress,
  publicLookup,
  selectFreshItems,
  storyCutoff,
  normalizeUrl,
  parseFeed,
  fetchFeed,
  ESPN_NEWS_URL,
  parseEspnNews,
  NotAFeedError,
  describeNonFeed,
  toPlainText,
} from "../dist/index.js";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[BBC News]]></title>
    <link>https://www.bbc.co.uk/news</link>
    <image><url>https://news.bbcimg.co.uk/logo.gif</url></image>
    <ttl>15</ttl>
    <item>
      <title><![CDATA['Feudal' leasehold system set to be scrapped]]></title>
      <description><![CDATA[Ground rent capped at &pound;250 &amp; more.]]></description>
      <link>https://www.bbc.co.uk/news/articles/abc?at_medium=RSS&amp;at_campaign=rss</link>
      <guid isPermaLink="false">https://www.bbc.co.uk/news/articles/abc#1</guid>
      <pubDate>Thu, 19 Nov 2026 02:02:23 GMT</pubDate>
      <media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/thumb.jpg"/>
    </item>
    <item>
      <title>Second story</title>
      <link>https://www.bbc.co.uk/news/articles/def</link>
      <content:encoded><![CDATA[<p>Body with <img src="/img/inline.png"> an image.</p>]]></content:encoded>
    </item>
    <item>
      <title>No link, dropped</title>
    </item>
  </channel>
</rss>`;

test("parses RSS 2.0 channel and items", () => {
  const feed = parseFeed(RSS);
  assert.equal(feed.title, "BBC News");
  assert.equal(feed.siteUrl, "https://www.bbc.co.uk/news");
  assert.equal(feed.imageUrl, "https://news.bbcimg.co.uk/logo.gif");
  assert.equal(feed.items.length, 2);

  const [first, second] = feed.items;
  assert.equal(first.title, "'Feudal' leasehold system set to be scrapped");
  assert.equal(first.guid, "https://www.bbc.co.uk/news/articles/abc#1");
  assert.equal(
    first.link,
    "https://www.bbc.co.uk/news/articles/abc?at_medium=RSS&at_campaign=rss",
  );
  assert.equal(first.imageUrl, "https://ichef.bbci.co.uk/thumb.jpg");
  assert.equal(first.publishedAt.toISOString(), "2026-11-19T02:02:23.000Z");
  assert.match(first.summary, /Ground rent capped at .250 & more\./);

  assert.equal(second.guid, "https://www.bbc.co.uk/news/articles/def");
  assert.equal(second.summary, "Body with an image.");
  assert.equal(second.imageUrl, "https://www.bbc.co.uk/img/inline.png");
  assert.equal(second.publishedAt, null);
});

test("parses Atom", () => {
  const feed = parseFeed(`<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>The Verge</title>
  <link rel="self" href="https://www.theverge.com/rss/index.xml"/>
  <link rel="alternate" href="https://www.theverge.com/"/>
  <icon>https://www.theverge.com/icon.png</icon>
  <entry>
    <id>tag:theverge.com,2026:1</id>
    <title type="html">Gadgets &amp;amp; more</title>
    <link rel="alternate" type="text/html" href="https://www.theverge.com/story/1"/>
    <published>2026-11-18T12:00:00Z</published>
    <summary type="html">&lt;p&gt;Our picks.&lt;/p&gt;</summary>
  </entry>
</feed>`);
  assert.equal(feed.title, "The Verge");
  assert.equal(feed.siteUrl, "https://www.theverge.com/");
  assert.equal(feed.imageUrl, "https://www.theverge.com/icon.png");
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].guid, "tag:theverge.com,2026:1");
  assert.equal(feed.items[0].title, "Gadgets & more");
  assert.equal(feed.items[0].link, "https://www.theverge.com/story/1");
  assert.equal(feed.items[0].summary, "Our picks.");
});

test("parses RSS 1.0 (RDF)", () => {
  const feed = parseFeed(`<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel><title>Slashdot</title><link>https://slashdot.org/</link></channel>
  <item><title>One</title><link>https://slashdot.org/1</link><dc:date>2026-11-18T10:00:00+00:00</dc:date></item>
</rdf:RDF>`);
  assert.equal(feed.title, "Slashdot");
  assert.equal(feed.items.length, 1);
  assert.equal(
    feed.items[0].publishedAt.toISOString(),
    "2026-11-18T10:00:00.000Z",
  );
});

test("tidies Google News topic feeds", () => {
  const feed = parseFeed(`<rss><channel><title>"Knicks" - Google News</title>
    <item><title>Knicks win - Yahoo Sports</title><link>https://news.google.com/a</link>
      <description>&lt;a href="x"&gt;Knicks win - Yahoo Sports&lt;/a&gt;&amp;nbsp;Yahoo Sports</description></item>
  </channel></rss>`);
  assert.equal(feed.title, "Knicks · Google News");
  assert.equal(feed.items[0].summary, null);
});

test("rejects HTML and junk as not a feed", () => {
  assert.throws(() => parseFeed("<html><body>hi</body></html>"), /Not an RSS/);
  assert.throws(() => parseFeed("plain text"), /Not an RSS/);
});

test("drops non-http links and images", () => {
  const feed = parseFeed(`<rss><channel><title>x</title>
    <item><title>a</title><link>javascript:alert(1)</link></item>
    <item><title>b</title><link>https://ok.example/b</link><enclosure type="image/png" url="data:image/png;base64,AAA"/></item>
  </channel></rss>`);
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].imageUrl, null);
});

test("toPlainText strips tags, decodes entities, truncates on a word", () => {
  assert.equal(
    toPlainText("<b>Hi</b>&nbsp;there &#8217;s &#x2014;"),
    "Hi there ’s —",
  );
  const long = toPlainText("word ".repeat(100), 20);
  assert.ok(long.length <= 20);
  assert.ok(long.endsWith("…"));
});

test("isPublicAddress blocks private, loopback and link-local ranges", () => {
  for (const addr of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ]) {
    assert.equal(isPublicAddress(addr), false, addr);
  }
  for (const addr of ["151.101.0.81", "8.8.8.8", "2606:4700::1111"]) {
    assert.equal(isPublicAddress(addr), true, addr);
  }
});

test("normalizeUrl adds https and rejects other schemes", () => {
  assert.equal(normalizeUrl("bbc.com").toString(), "https://bbc.com/");
  assert.equal(
    normalizeUrl(" http://example.com/feed#x ").toString(),
    "http://example.com/feed",
  );
  for (const bad of [
    "",
    "file:///etc/passwd",
    "ftp://x.com",
    "https://u:p@x.com",
  ]) {
    assert.throws(() => normalizeUrl(bad), FeedError, bad);
  }
});

test("fetchFeed refuses local addresses without fetching", async () => {
  for (const url of [
    "http://127.0.0.1:3000/feed",
    "http://localhost/feed",
    "http://[::1]/x",
  ]) {
    await assert.rejects(
      fetchFeed(url),
      (err) => err instanceof FeedError && err.code === "blocked",
    );
  }
});

test("publicLookup refuses names that resolve to private addresses", async () => {
  for (const all of [false, true]) {
    const err = await new Promise((resolve) =>
      publicLookup("localhost", { all }, (e) => resolve(e)),
    );
    assert.equal(err?.code, "EBLOCKED");
  }
});

test("stories live 72 hours", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  assert.equal(storyCutoff(now).toISOString(), "2026-11-16T12:00:00.000Z");
});

test("selectFreshItems keeps the newest 50 unexpired, dated, deduped stories", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  const at = (minutesAgo) => new Date(now.getTime() - minutesAgo * 60_000);
  const story = (guid, publishedAt) => ({
    guid,
    title: guid,
    link: `https://example.com/${guid}`,
    summary: null,
    imageUrl: null,
    publishedAt,
  });
  // Relevance order: the newest story is ranked last.
  const items = [
    story("week-old", at(7 * 24 * 60)),
    ...Array.from({ length: 60 }, (_, i) => story(`s${i}`, at(100 + i))),
    story("s0", at(1)),
    story("undated", null),
    story("future", at(-60)),
    story("newest", at(5)),
  ];
  const picked = selectFreshItems(items, now);
  assert.equal(picked.length, 50);
  assert.deepEqual(
    picked.slice(0, 3).map((i) => i.guid),
    ["newest", "s0", "s1"],
  );
  assert.ok(!picked.some((i) => i.guid === "undated" || i.guid === "future"));
  assert.ok(!picked.some((i) => i.guid === "week-old"));
  assert.equal(picked.filter((i) => i.guid === "s0").length, 1);
});

test("describeNonFeed shows what came back instead of a feed", () => {
  assert.equal(
    describeNonFeed({
      url: "https://www.espn.com/espn/rss/news",
      contentType: "text/html; charset=utf-8",
      body: "\n  <!DOCTYPE html>\n<html>\n  <title>Access Denied</title>",
    }),
    'text/html; charset=utf-8, 56 bytes from https://www.espn.com/espn/rss/news: "<!DOCTYPE html> <html> <title>Access Denied</title>"',
  );
  assert.equal(
    describeNonFeed({ url: "https://example.com/", contentType: "", body: "" }),
    'no content-type, 0 bytes from https://example.com/: ""',
  );
});

test("parseEspnNews reads ESPN's news API, stories only", () => {
  const feed = parseEspnNews(
    JSON.stringify({
      headlines: [
        {
          id: 50585586,
          type: "Story",
          headline: "WNBA players elect Williams to lead union",
          description: "Sky center Elizabeth Williams was elected president.",
          published: "2026-11-24T20:38:07Z",
          links: {
            web: { href: "https://www.espn.com/wnba/story/_/id/50585586/x" },
          },
          images: [{ url: "https://a.espncdn.com/photo/r1750763.jpg" }],
        },
        {
          id: 401921022,
          type: "Recap",
          headline: "Notre Dame holds off Davidson",
          links: { web: { href: "https://www.espn.com/ncw/recap?gameId=1" } },
        },
        { id: 3, type: "HeadlineNews", headline: "No link, dropped" },
      ],
    }),
  );
  assert.equal(feed.title, "ESPN");
  assert.equal(feed.siteUrl, "https://www.espn.com/");
  assert.deepEqual(feed.items, [
    {
      guid: "US-EN-50585586",
      title: "WNBA players elect Williams to lead union",
      link: "https://www.espn.com/wnba/story/_/id/50585586/x",
      summary: "Sky center Elizabeth Williams was elected president.",
      imageUrl: "https://a.espncdn.com/photo/r1750763.jpg",
      publishedAt: new Date("2026-11-24T20:38:07Z"),
    },
  ]);
});

test("parseEspnNews rejects anything else", () => {
  for (const body of ["", "<html></html>", "{}", '{"headlines":null}']) {
    assert.throws(() => parseEspnNews(body), NotAFeedError, body);
  }
});

test("ESPN_NEWS_URL survives normalizeUrl", () => {
  assert.equal(normalizeUrl(ESPN_NEWS_URL).toString(), ESPN_NEWS_URL);
});
