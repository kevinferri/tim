"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpIcon,
  ChevronLeftIcon,
  Cross2Icon,
  ExternalLinkIcon,
  InfoCircledIcon,
  PlusIcon,
  Share1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { formatFeedTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import {
  NEWS_PRESETS,
  VISIBLE_PRESETS,
  addNewsSource,
  googleNewsTopicUrl,
  looksLikeUrl,
  prependNewsItems,
  removeNewsSource,
  type NewsItemDto,
  type NewsSourceDto,
} from "./news-api";
import { NewsGlyph } from "./news-glyph";
import { useNewsStore } from "./news-store";
import { NewsShare, type NewsTopic } from "./news-share";
import { useNewestArrival, useNewsFeed, useNewsLiveUpdates } from "./use-news";

type View = "feed" | "sources" | "share";

type Sharing = { item: NewsItemDto; source?: NewsSourceDto };

/** Mounted once in the circle layout, so live updates land even while the panel is closed. */
export function NewsSheet({
  circleId,
  topics,
  defaultTopicId,
}: {
  circleId: string;
  topics: NewsTopic[];
  defaultTopicId: string | null;
}) {
  useNewsLiveUpdates(circleId);
  const queryClient = useQueryClient();
  const { open, close, takePending, markSeen } = useNewsStore();
  const held = useNewsStore((s) => s.pending[circleId]);
  const [view, setView] = useState<View>("feed");
  const feedId = useNewsStore((s) => s.filter[circleId] ?? null);
  const storeSetFilter = useNewsStore((s) => s.setFilter);
  // Held stories were judged against the old view, so place them before switching.
  const setFeedId = (next: string | null) => {
    prependNewsItems(queryClient, circleId, takePending(circleId));
    storeSetFilter(circleId, next);
  };
  const [sharing, setSharing] = useState<Sharing | null>(null);
  const listTopRef = useRef<HTMLDivElement>(null);

  const all = useNewsFeed(circleId);
  const sources = all.data?.pages[0]?.sources ?? [];
  const newest = useNewestArrival(circleId);
  // A refetch (reconnect, another member changing sources) may already have listed some held stories.
  // Counted against the view on screen; held stories were already picked for it.
  const visible = useNewsFeed(circleId, feedId);
  const listedIds = new Set(
    visible.data?.pages.flatMap((p) => p.items.map((i) => i.id)) ?? [],
  );
  const pending = (held ?? []).filter((i) => !listedIds.has(i.id));

  useEffect(() => {
    if (open) markSeen(circleId, newest);
  }, [open, circleId, newest, markSeen]);

  // A filter for a source someone just removed would show an empty list forever.
  const filterIsStale =
    feedId !== null &&
    Boolean(all.data) &&
    !sources.some((s) => s.feedId === feedId);
  useEffect(() => {
    if (filterIsStale) storeSetFilter(circleId, null);
  }, [filterIsStale, storeSetFilter, circleId]);

  function showPending() {
    prependNewsItems(queryClient, circleId, takePending(circleId));
    listTopRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleClose() {
    prependNewsItems(queryClient, circleId, takePending(circleId));
    setView("feed");
    setSharing(null);
    close();
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && handleClose()}>
      <SheetContent
        side="right"
        className="flex w-3/4 flex-col gap-0 p-0 sm:max-w-md [&>button]:hidden"
      >
        <SheetTitle className="sr-only">News</SheetTitle>
        <div className="flex shrink-0 items-center gap-1.5 border-b px-3 py-3">
          {view !== "feed" ? (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setView("feed")}
              aria-label="Back to news"
            >
              <ChevronLeftIcon />
            </Button>
          ) : (
            <NewsGlyph className="size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1 truncate font-semibold">
            {view === "sources"
              ? "Sources"
              : view === "share"
                ? "Share story"
                : "News"}
            {view === "feed" && sources.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-normal text-emerald-600 dark:text-emerald-400">
                <span
                  className="size-1.5 rounded-full bg-emerald-500"
                  aria-hidden
                />
                Live
              </span>
            )}
          </div>
          {view === "feed" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2"
              onClick={() => setView("sources")}
            >
              <PlusIcon />
              Sources
            </Button>
          )}
          <Button
            variant="ghost"
            size="iconSm"
            onClick={handleClose}
            aria-label="Close news"
          >
            <Cross2Icon />
          </Button>
        </div>

        {view === "sources" ? (
          <SourcesView circleId={circleId} sources={sources} />
        ) : (
          // The feed stays mounted under the share form so cancelling returns to the same scroll position.
          <div className="relative flex min-h-0 flex-1 flex-col">
            {all.isPending ? (
              <FeedSkeleton />
            ) : sources.length === 0 ? (
              <EmptyState onAdd={() => setView("sources")} />
            ) : (
              <>
                <SourceChips
                  sources={sources}
                  feedId={feedId}
                  onSelect={setFeedId}
                />
                <div className="relative flex min-h-0 flex-1 flex-col">
                  {pending.length > 0 && (
                    <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
                      <Button
                        size="xs"
                        className="pointer-events-auto gap-1 rounded-full shadow-sm"
                        onClick={showPending}
                      >
                        <ArrowUpIcon />
                        {pending.length} new{" "}
                        {pending.length === 1 ? "story" : "stories"}
                      </Button>
                    </div>
                  )}
                  <ScrollArea className="flex-1">
                    <div ref={listTopRef} />
                    <FeedList
                      circleId={circleId}
                      feedId={feedId}
                      sources={sources}
                      onShare={(item, source) => {
                        setSharing({ item, source });
                        setView("share");
                      }}
                    />
                  </ScrollArea>
                </div>
              </>
            )}
            {view === "share" && sharing && (
              <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-background">
                <NewsShare
                  key={sharing.item.id}
                  circleId={circleId}
                  topics={topics}
                  defaultTopicId={defaultTopicId}
                  item={sharing.item}
                  source={sharing.source}
                  onDone={() => setView("feed")}
                />
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SourceChips({
  sources,
  feedId,
  onSelect,
}: {
  sources: NewsSourceDto[];
  feedId: string | null;
  onSelect: (feedId: string | null) => void;
}) {
  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    );
  return (
    <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b px-3 py-2 [scrollbar-width:none]">
      <button
        type="button"
        className={chip(feedId === null)}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {sources.map((s) => (
        <button
          key={s.feedId}
          type="button"
          className={cn(chip(feedId === s.feedId), "max-w-40 truncate")}
          onClick={() => onSelect(s.feedId)}
        >
          {s.title}
        </button>
      ))}
    </div>
  );
}

function FeedList({
  circleId,
  feedId,
  sources,
  onShare,
}: {
  circleId: string;
  feedId: string | null;
  sources: NewsSourceDto[];
  onShare: (item: NewsItemDto, source?: NewsSourceDto) => void;
}) {
  const {
    data,
    isPending,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useNewsFeed(circleId, feedId);
  const byId = new Map(sources.map((s) => [s.feedId, s]));
  // Deduped as a safety net: the same story must never render under one key twice.
  const seenIds = new Set<string>();
  const items = (data?.pages.flatMap((p) => p.items) ?? []).filter(
    (i) => !seenIds.has(i.id) && Boolean(seenIds.add(i.id)),
  );
  const now = new Date();

  if (isPending) return <FeedSkeleton />;
  if (isError) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        Couldn&apos;t load news.
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        Nothing from the last 24 hours yet. New stories show up here as
        they&apos;re published.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <NewsCard
          key={item.id}
          item={item}
          source={byId.get(item.feedId)}
          now={now}
          onShare={() => onShare(item, byId.get(item.feedId))}
        />
      ))}
      {hasNextPage && (
        <div className="flex justify-center p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load older stories"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SourceMark({ source }: { source?: NewsSourceDto }) {
  const [broken, setBroken] = useState(false);
  if (source?.imageUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party hosts
      <img
        src={source.imageUrl}
        alt=""
        className="size-4 shrink-0 rounded-sm object-contain"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-muted text-[9px] font-semibold uppercase text-muted-foreground">
      {source?.title.charAt(0) ?? "?"}
    </span>
  );
}

function NewsCard({
  item,
  source,
  now,
  onShare,
}: {
  item: NewsItemDto;
  source?: NewsSourceDto;
  now: Date;
  onShare: () => void;
}) {
  const [imageBroken, setImageBroken] = useState(false);

  return (
    <article className="group relative border-b px-3 py-3 transition-colors hover:bg-accent/40">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <SourceMark source={source} />
            <span className="truncate">{source?.title ?? "News"}</span>
            <span aria-hidden>·</span>
            <time dateTime={item.publishedAt} className="shrink-0">
              {formatFeedTime(new Date(item.publishedAt), now)}
            </time>
          </div>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium leading-snug after:absolute after:inset-0 focus-visible:outline-none"
          >
            {item.title}
          </a>
          {item.summary && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {item.summary}
            </p>
          )}
        </div>
        {item.imageUrl && !imageBroken && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party hosts
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="mt-0.5 h-16 w-24 shrink-0 rounded-md object-cover"
            onError={() => setImageBroken(true)}
          />
        )}
      </div>
      <div className="relative z-10 mt-2 flex gap-1 opacity-70 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="xs"
          className="gap-1 text-muted-foreground"
          onClick={onShare}
        >
          <Share1Icon />
          Share
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className="gap-1 text-muted-foreground"
          asChild
        >
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon />
            Open
          </a>
        </Button>
      </div>
    </article>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-16 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <NewsGlyph className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">Start your circle&apos;s news feed</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow news sites or topics, and new stories show up here live for
          everyone in the circle.
        </p>
      </div>
      <Button size="sm" onClick={onAdd}>
        Add sources
      </Button>
    </div>
  );
}

function SourcesView({
  circleId,
  sources,
}: {
  circleId: string;
  sources: NewsSourceDto[];
}) {
  const queryClient = useQueryClient();
  const { emit: pingSourcesChanged } = useSocketEmit<{ circleId: string }>(
    SocketEvent.NewsSourcesChanged,
  );
  const [siteUrl, setSiteUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["news", circleId] });
    pingSourcesChanged({ circleId });
  }

  const add = useMutation({
    mutationFn: (url: string) => addNewsSource(circleId, url),
    onMutate: () => setError(null),
    onSuccess: async () => {
      setSiteUrl("");
      setTopic("");
      await refresh();
    },
    onError: (err) => setError(err.message),
  });

  const remove = useMutation({
    mutationFn: (feedId: string) => removeNewsSource(circleId, feedId),
    onMutate: () => setError(null),
    onSuccess: refresh,
    onError: (err) => setError(err.message),
  });

  const followed = new Set(sources.map((s) => s.url));
  const presets = NEWS_PRESETS.filter((p) => !followed.has(p.url)).slice(
    0,
    VISIBLE_PRESETS,
  );

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-6 p-3">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (siteUrl.trim()) add.mutate(siteUrl);
          }}
        >
          <div className="flex items-center gap-1.5">
            <label htmlFor="news-site" className="text-sm font-medium">
              Add a site or feed
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Help finding a feed"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <InfoCircledIcon />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="w-64 text-sm"
              >
                Can&apos;t find a site&apos;s feed? Search for it on{" "}
                <a
                  href="https://feeder.co/discover"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  Feeder
                </a>
                , then paste the feed URL here.
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-2">
            <Input
              id="news-site"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="theverge.com"
              autoComplete="off"
              disabled={add.isPending}
            />
            <Button type="submit" disabled={add.isPending || !siteUrl.trim()}>
              Add
            </Button>
          </div>
        </form>

        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = topic.trim();
            if (!value) return;
            // A pasted link (e.g. a Google News feed URL) is a source, not a search term.
            add.mutate(looksLikeUrl(value) ? value : googleNewsTopicUrl(value));
          }}
        >
          <label htmlFor="news-topic" className="text-sm font-medium">
            Follow a topic
          </label>
          <p className="-mt-1 text-xs text-muted-foreground">
            Type a team, person, company, or subject. You&apos;ll get the latest
            headlines about it from news sites everywhere, via Google News.
          </p>
          <div className="flex gap-2">
            <Input
              id="news-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Knicks, Taylor Swift, AI…"
              autoComplete="off"
              disabled={add.isPending}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={add.isPending || !topic.trim()}
            >
              Follow
            </Button>
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {add.isPending && (
          <p className="text-sm text-muted-foreground">Finding the feed…</p>
        )}

        {presets.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Popular
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <Button
                  key={p.url}
                  variant="outline"
                  size="xs"
                  className="gap-1"
                  disabled={add.isPending}
                  onClick={() => add.mutate(p.url)}
                >
                  <PlusIcon />
                  {p.name}
                </Button>
              ))}
            </div>
          </section>
        )}

        {sources.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Following
            </h3>
            {sources.map((s) => (
              <div
                key={s.feedId}
                className="flex items-center gap-2 rounded-md px-1 py-1.5"
              >
                <SourceMark source={s} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{s.title}</div>
                  {s.siteUrl && (
                    <div className="truncate text-xs text-muted-foreground">
                      {new URL(s.siteUrl).hostname}
                    </div>
                  )}
                </div>
                {s.canRemove && (
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label={`Remove ${s.title}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(s.feedId)}
                  >
                    <TrashIcon />
                  </Button>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </ScrollArea>
  );
}
