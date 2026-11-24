-- ESPN's RSS feed comes back empty to the server, so its preset moved to ESPN's JSON news API (TIM-46).
UPDATE "news_feeds"
SET "url" = 'https://now.core.api.espn.com/v1/sports/news?limit=50',
    "etag" = NULL,
    "lastModified" = NULL,
    "nextFetchAt" = CURRENT_TIMESTAMP
WHERE "url" = 'https://www.espn.com/espn/rss/news'
  AND NOT EXISTS (
    SELECT 1 FROM "news_feeds"
    WHERE "url" = 'https://now.core.api.espn.com/v1/sports/news?limit=50'
  );
