import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { MessageProps, MessageData } from "@/components/topics/message";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import {
  HighlightAddedPayload,
  HighlightRemovedPayload,
  findCachedTopicMessage,
  updateMessagesCache,
  updateMediaMessagesCache,
  updateThreadCache,
  withHighlightAdded,
  withHighlightRemoved,
} from "@/components/topics/provider/topic-query-cache";
import {
  TopListUpdate,
  applyHighlightAdded,
  applyHighlightRemoved,
  rankTopHighlights,
} from "@/components/topics/provider/top-highlights-list";
import {
  DEFAULT_HIGHLIGHT_PERIOD,
  HighlightPeriod,
  getHighlightPeriodStart,
} from "@/lib/highlight-period";

type UseTopicHighlightsProps = {
  topicId: string;
  existingTopHighlights: MessageData[];
  topHighlightsLimit: number;
};

// Coalesces a burst of highlight events into one refetch.
const REFETCH_DEBOUNCE_MS = 300;

export function useTopicHighlights({
  topicId,
  existingTopHighlights,
  topHighlightsLimit: limit,
}: UseTopicHighlightsProps) {
  const queryClient = useQueryClient();
  const [period, setPeriodState] = useState<HighlightPeriod>(
    DEFAULT_HIGHLIGHT_PERIOD,
  );
  const queryKey = useMemo(
    () => ["top-highlights", topicId, period],
    [topicId, period],
  );

  // SSR data only seeds the first view of the default period; once the user
  // switches, coming back must refetch rather than resurrect the stale seed.
  const hasSwitchedRef = useRef(false);
  const setPeriod = useCallback((next: HighlightPeriod) => {
    hasSwitchedRef.current = true;
    setPeriodState(next);
  }, []);

  // staleTime: Infinity -> only fetches when a period has no cache entry, or on
  // explicit refetch. gcTime: 0 drops unviewed periods, since the socket
  // handlers below only keep the visible period's list current.
  const {
    data,
    refetch: refreshTopHighlights,
    isPlaceholderData,
  } = useQuery({
    queryKey,
    queryFn: () => {
      const since = getHighlightPeriodStart(period);
      const qs = since
        ? `?since=${encodeURIComponent(since.toISOString())}`
        : "";
      return fetch(`/api/topics/${topicId}/top-highlights${qs}`).then((r) => {
        if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
        return r.json() as Promise<MessageProps[]>;
      });
    },
    initialData:
      period === DEFAULT_HIGHLIGHT_PERIOD && !hasSwitchedRef.current
        ? (existingTopHighlights as MessageProps[])
        : undefined,
    staleTime: Infinity,
    gcTime: 0,
    placeholderData: keepPreviousData,
  });

  const topHighlights = useMemo(
    () => rankTopHighlights(data ?? [], limit),
    [data, limit],
  );

  const refetchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(refetchTimerRef.current), []);

  const scheduleRefetch = useCallback(() => {
    clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(
      () => refreshTopHighlights(),
      REFETCH_DEBOUNCE_MS,
    );
  }, [refreshTopHighlights]);

  const updateTopList = useCallback(
    (apply: (list: MessageProps[]) => TopListUpdate) => {
      const prev = queryClient.getQueryData<MessageProps[]>(queryKey);
      // Mid-fetch for a newly selected period; the response will include this.
      if (!prev) return;

      const { list, refetch } = apply(prev);
      if (list !== prev) queryClient.setQueryData(queryKey, list);
      if (refetch) scheduleRefetch();
    },
    [queryClient, queryKey, scheduleRefetch],
  );

  const patchTopicCaches = useCallback(
    (patch: (m: MessageProps) => MessageProps) => {
      const patchList = (prev: MessageProps[]) => prev.map(patch);
      updateMessagesCache(queryClient, topicId, patchList);
      updateMediaMessagesCache(queryClient, topicId, patchList);
      updateThreadCache(queryClient, topicId, patchList);
    },
    [queryClient, topicId],
  );

  // A payload without topicId is from an older server build; treat it as ours.
  const isOtherTopic = (eventTopicId?: string) =>
    !!eventTopicId && eventTopicId !== topicId;

  useSocketHandler<HighlightAddedPayload>(
    SocketEvent.AddedHighlight,
    (payload) => {
      if (isOtherTopic(payload.topicId)) return;
      const messageId = payload.highlight.messageId;
      const patch = withHighlightAdded(payload);

      patchTopicCaches(patch);
      updateTopList((list) =>
        applyHighlightAdded(list, {
          messageId,
          patch,
          knownMessage: findCachedTopicMessage(queryClient, topicId, messageId),
          periodStart: getHighlightPeriodStart(period),
          limit,
        }),
      );
    },
  );

  useSocketHandler<HighlightRemovedPayload>(
    SocketEvent.RemovedHighlight,
    (payload) => {
      if (isOtherTopic(payload.topicId)) return;
      const patch = withHighlightRemoved(payload);

      patchTopicCaches(patch);
      updateTopList((list) =>
        applyHighlightRemoved(list, {
          messageId: payload.messageId,
          patch,
          limit,
        }),
      );
    },
  );

  return {
    topHighlights,
    refreshTopHighlights,
    period,
    setPeriod,
    isLoadingPeriod: isPlaceholderData,
  };
}
