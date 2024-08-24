"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function useFetch<T>(
  url: string,
  opts: { skip?: boolean; onLoad?: () => void } = {}
) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!!opts.skip) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const resp = await fetch(url);

        if (!resp.ok) {
          setError(true);
          setData(undefined);
        }

        const json = await resp.json();

        setData(json);
        opts.onLoad?.();
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, opts.skip]);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}

export function useLazyFetch<T>(url: string, onLoadMore?: (data: T) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await fetch(url);

      if (!resp.ok) {
        setError(true);
      }

      const json = await resp.json();
      onLoadMore?.(json);

      return json as T;
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [url, onLoadMore]);

  return useMemo(
    () => ({ fetchData, loading, error }),
    [fetchData, loading, error]
  );
}
