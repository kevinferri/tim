import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FeedError,
  discoverFeedUrls,
  isPublicAddress,
  nextFetchDelayMinutes,
  normalizeUrl,
  parseFeed,
  resolveFeed,
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
  assert.equal(feed.ttlMinutes, 15);
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

test("discovers advertised feed URLs from HTML", () => {
  const urls = discoverFeedUrls(
    `<head>
      <link rel="stylesheet" href="/s.css">
      <link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml">
      <link type='application/atom+xml' rel='alternate' href='https://cdn.example.com/atom'>
      <link rel="alternate" type="application/rss+xml" href="/feed.xml">
    </head>`,
    "https://example.com/news/",
  );
  assert.deepEqual(urls, [
    "https://example.com/feed.xml",
    "https://cdn.example.com/atom",
  ]);
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

test("resolveFeed refuses local addresses without fetching", async () => {
  for (const url of [
    "http://127.0.0.1:3000/feed",
    "http://localhost/feed",
    "http://[::1]/x",
  ]) {
    await assert.rejects(
      resolveFeed(url),
      (err) => err instanceof FeedError && err.code === "blocked",
    );
  }
});

test("nextFetchDelayMinutes honors ttl within bounds and backs off on failure", () => {
  assert.equal(nextFetchDelayMinutes({ ttlMinutes: null, failureCount: 0 }), 5);
  assert.equal(nextFetchDelayMinutes({ ttlMinutes: 15, failureCount: 0 }), 15);
  assert.equal(nextFetchDelayMinutes({ ttlMinutes: 1, failureCount: 0 }), 5);
  assert.equal(
    nextFetchDelayMinutes({ ttlMinutes: 1440, failureCount: 0 }),
    60,
  );
  assert.equal(
    nextFetchDelayMinutes({ ttlMinutes: null, failureCount: 1 }),
    10,
  );
  assert.equal(
    nextFetchDelayMinutes({ ttlMinutes: null, failureCount: 20 }),
    360,
  );
});
