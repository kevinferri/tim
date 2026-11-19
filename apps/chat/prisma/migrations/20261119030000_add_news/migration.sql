-- CreateTable
CREATE TABLE "news_feeds" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "siteUrl" TEXT,
    "imageUrl" TEXT,
    "ttlMinutes" INTEGER,
    "etag" TEXT,
    "lastModified" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "nextFetchAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "news_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "circle_news_sources" (
    "circleId" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_news_sources_pkey" PRIMARY KEY ("circleId","feedId")
);

-- CreateTable
CREATE TABLE "news_items" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedId" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "summary" TEXT,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_feeds_url_key" ON "news_feeds"("url");

-- CreateIndex
CREATE INDEX "news_feeds_nextFetchAt_idx" ON "news_feeds"("nextFetchAt");

-- CreateIndex
CREATE INDEX "circle_news_sources_feedId_idx" ON "circle_news_sources"("feedId");

-- CreateIndex
CREATE INDEX "circle_news_sources_addedById_idx" ON "circle_news_sources"("addedById");

-- CreateIndex
CREATE INDEX "news_items_feedId_publishedAt_idx" ON "news_items"("feedId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "news_items_lastSeenAt_idx" ON "news_items"("lastSeenAt");

-- CreateIndex
CREATE INDEX "news_items_link_idx" ON "news_items"("link");

-- CreateIndex
CREATE UNIQUE INDEX "news_items_feedId_guid_key" ON "news_items"("feedId", "guid");

-- AddForeignKey
ALTER TABLE "circle_news_sources" ADD CONSTRAINT "circle_news_sources_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_news_sources" ADD CONSTRAINT "circle_news_sources_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "news_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circle_news_sources" ADD CONSTRAINT "circle_news_sources_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "news_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
