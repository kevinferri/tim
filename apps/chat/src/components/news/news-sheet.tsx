"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { REFRESH_THROTTLE_MINUTES } from "@tim/news/shared";
import {
  ChevronLeftIcon,
  Cross2Icon,
  ExternalLinkIcon,
  PlusIcon,
  Share1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFeedTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import {
  MAX_TOPIC_LENGTH,
  cleanTopic,
  exactPreset,
  suggestPresets,
  type NewsSourceRequest,
} from "@/lib/news-sources";
import {
  addNewsSource,
  removeNewsSource,
  setNewsEnabled,
  type NewsItemDto,
  type NewsSourceDto,
} from "./news-api";
import { NewsGlyph } from "./news-glyph";
import { useNewsStore } from "./news-store";
import { NewsShare } from "./news-share";
import {
  useNewestArrival,
  useNewsChanged,
  useNewsFeed,
  useNewsLiveUpdates,
  useNewsRefresh,
} from "./use-news";

type View = "feed" | "sources" | "share";

type Sharing = { item: NewsItemDto; source?: NewsSourceDto };

/** Mounted once in the circle layout, so live updates land even while the panel is closed. */
export function NewsSheet({ circleId }: { circleId: string }) {
  useNewsLiveUpdates(circleId);
  const { open, close, markSeen } = useNewsStore();
  const [view, setView] = useState<View>("feed");
  const feedId = useNewsStore((s) => s.filter[circleId] ?? null);
  const setFilter = useNewsStore((s) => s.setFilter);
  const [sharing, setSharing] = useState<Sharing | null>(null);

  const all = useNewsFeed(circleId);
  const sources = all.data?.pages[0]?.sources ?? [];
  const enabled = all.data?.pages[0]?.enabled ?? false;
  const isAdmin = all.data?.pages[0]?.isAdmin ?? false;
  const newest = useNewestArrival(circleId);

  useEffect(() => {
    if (open) markSeen(circleId, newest);
  }, [open, circleId, newest, markSeen]);

  const refresh = useNewsRefresh(circleId);
  useEffect(() => {
    if (!open) return;
    refresh();
    const timer = setInterval(refresh, REFRESH_THROTTLE_MINUTES * 60_000);
    return () => clearInterval(timer);
  }, [open, refresh]);

  // A filter for a source someone just removed would show an empty list forever.
  const filterIsStale =
    feedId !== null &&
    Boolean(all.data) &&
    !sources.some((s) => s.feedId === feedId);
  useEffect(() => {
    if (filterIsStale) setFilter(circleId, null);
  }, [filterIsStale, setFilter, circleId]);

  function handleClose() {
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
        {/* Fixed height and a fixed-size leading slot, so switching views doesn't shift the header. */}
        <div className="flex h-12 shrink-0 items-center gap-1.5 border-b px-3">
          <div className="flex size-6 shrink-0 items-center justify-center">
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
              <NewsGlyph className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1 truncate font-semibold">
            {view === "sources"
              ? "Sources"
              : view === "share"
                ? "Share story"
                : "News"}
          </div>
          {view === "feed" && enabled && (
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
          <SourcesView
            circleId={circleId}
            sources={sources}
            isAdmin={isAdmin}
            onTurnedOff={() => setView("feed")}
          />
        ) : (
          // The feed stays mounted under the share form so cancelling returns to the same scroll position.
          <div className="relative flex min-h-0 flex-1 flex-col">
            {all.isPending ? (
              <FeedSkeleton />
            ) : !enabled ? (
              <NewsOff circleId={circleId} isAdmin={isAdmin} />
            ) : sources.length === 0 ? (
              <EmptyState onAdd={() => setView("sources")} />
            ) : (
              <>
                <SourceChips
                  sources={sources}
                  feedId={feedId}
                  onSelect={(next) => setFilter(circleId, next)}
                />
                <ScrollArea className="flex-1">
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
              </>
            )}
            {view === "share" && sharing && (
              <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-background">
                <NewsShare
                  key={sharing.item.id}
                  circleId={circleId}
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
        Nothing from the last 3 days yet. New stories show up here as
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

function useSetNewsEnabled(circleId: string) {
  const changed = useNewsChanged(circleId);
  const refresh = useNewsRefresh(circleId);
  return useMutation({
    mutationFn: (enabled: boolean) => setNewsEnabled(circleId, enabled),
    onSuccess: async (_, enabled) => {
      await changed();
      if (enabled) refresh();
    },
  });
}

function NewsOff({
  circleId,
  isAdmin,
}: {
  circleId: string;
  isAdmin: boolean;
}) {
  const setEnabled = useSetNewsEnabled(circleId);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <NewsGlyph className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">News is off for this circle</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Turn it on to follow news sites or topics, with new stories showing up here for everyone in the circle."
            : "The circle’s creator can turn it on."}
        </p>
      </div>
      {isAdmin && (
        <Button
          size="sm"
          onClick={() => setEnabled.mutate(true)}
          disabled={setEnabled.isPending}
        >
          Turn on News
        </Button>
      )}
      {setEnabled.error && (
        <p className="text-sm text-destructive">{setEnabled.error.message}</p>
      )}
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
  isAdmin,
  onTurnedOff,
}: {
  circleId: string;
  sources: NewsSourceDto[];
  isAdmin: boolean;
  onTurnedOff: () => void;
}) {
  const changed = useNewsChanged(circleId);
  const refreshNews = useNewsRefresh(circleId);
  const setEnabled = useSetNewsEnabled(circleId);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (request: NewsSourceRequest) =>
      addNewsSource(circleId, request),
    onMutate: () => setError(null),
    onSuccess: async () => {
      setQuery("");
      await changed();
      // The realtime server fetches the new source and pushes its stories.
      refreshNews();
    },
    onError: (err) => setError(err.message),
  });

  const remove = useMutation({
    mutationFn: (feedId: string) => removeNewsSource(circleId, feedId),
    onMutate: () => setError(null),
    onSuccess: changed,
    onError: (err) => setError(err.message),
  });

  const followed = new Set(sources.map((s) => s.url));
  const suggestions = suggestPresets(query, followed);
  const topic = cleanTopic(query);

  function submit() {
    if (!topic || add.isPending) return;
    const preset = exactPreset(topic);
    add.mutate(
      preset && !followed.has(preset.url) ? { preset: preset.url } : { topic },
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-6 p-3">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="news-search" className="text-sm font-medium">
            Add a source
          </label>
          <p className="-mt-1 text-xs text-muted-foreground">
            Search for a site, or type a team, person, company, or subject to
            follow it as a topic via Google News.
          </p>
          <Input
            id="news-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="The Verge, Knicks, AI…"
            autoComplete="off"
            maxLength={MAX_TOPIC_LENGTH}
          />
          <div className="flex flex-col gap-1.5">
            {!topic && suggestions.length > 0 && (
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Popular
              </h3>
            )}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((p) => (
                  <Button
                    key={p.url}
                    type="button"
                    variant="outline"
                    size="xs"
                    className="gap-1"
                    disabled={add.isPending}
                    onClick={() => add.mutate({ preset: p.url })}
                  >
                    <PlusIcon />
                    {p.name}
                  </Button>
                ))}
              </div>
            )}
            {topic && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="justify-start gap-1.5 self-start"
                disabled={add.isPending}
                onClick={() => add.mutate({ topic })}
              >
                <PlusIcon />
                <span className="truncate">
                  Follow &ldquo;{topic}&rdquo; as a topic
                </span>
              </Button>
            )}
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {sources.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="mb-1 text-sm font-medium">Following</h3>
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

        {isAdmin && (
          <section className="flex flex-col gap-2 border-t pt-4 text-sm">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Turn off News
            </h3>
            <p className="text-muted-foreground">
              Stops new stories for everyone in this circle. Sources are kept,
              and you can turn it back on anytime.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="self-start"
              disabled={setEnabled.isPending}
              onClick={() =>
                setEnabled.mutate(false, { onSuccess: onTurnedOff })
              }
            >
              Turn off News for this circle
            </Button>
            {setEnabled.error && (
              <p className="text-destructive">{setEnabled.error.message}</p>
            )}
          </section>
        )}
      </div>
    </ScrollArea>
  );
}
