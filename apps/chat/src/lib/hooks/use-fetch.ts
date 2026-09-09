"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useFetch<T>(
  opts: { url: string; skip?: boolean; onSuccess?: (data: T) => void } = {
    url: "",
  }
) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!!opts.skip) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(false);
        const resp = await fetch(opts.url);

        if (!resp.ok) {
          throw new Error(`Request failed with status ${resp.status}`);
        }

        const json = await resp.json();
        // A newer request may have started (url/skip changed) while this
        // one was in flight -- don't let a stale response clobber it.
        if (cancelled) return;

        setData(json);
        opts.onSuccess?.(json);
      } catch (e) {
        if (!cancelled) {
          setError(true);
          setData(undefined);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.url, opts.skip]);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}

export function useLazyFetch<T>(
  opts: { url: string; onSuccess?: (data: T) => void; skip?: boolean } = {
    url: "",
    skip: false,
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // A ref, not the `loading` state, guards against overlapping calls --
  // state updates are batched/async, so two calls fired in quick
  // succession (e.g. a fast double-scroll) could both pass a
  // `loading`-based check before either had a chance to flip it.
  const isFetchingRef = useRef(false);
  const { url, onSuccess, skip } = opts;

  const fetchData = useCallback(async () => {
    if (skip || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(false);

    try {
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error(`Request failed with status ${resp.status}`);
      }

      const json = (await resp.json()) as T;
      onSuccess?.(json);

      return json;
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [url, onSuccess, skip]);

  return useMemo(
    () => ({ fetchData, loading, error }),
    [fetchData, loading, error]
  );
}
