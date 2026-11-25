-- ESPN's RSS feed comes back empty to the server, so its preset moved to ESPN's JSON news API (TIM-46).
UPDATE "news_feeds"
SET "url" = 'https://now.core.api.espn.com/v1/sports/news?limit=50',
    "etag" = NULL,
    "lastModified" = NULL,
    -- Not now: the old realtime server may still be polling mid-deploy, and its failed fetch would push ESPN back an hour.
    "nextFetchAt" = CURRENT_TIMESTAMP + interval '10 minutes'
WHERE "url" = 'https://www.espn.com/espn/rss/news'
  AND NOT EXISTS (
    SELECT 1 FROM "news_feeds"
    WHERE "url" = 'https://now.core.api.espn.com/v1/sports/news?limit=50'
  );
