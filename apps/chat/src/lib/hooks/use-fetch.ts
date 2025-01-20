"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

    const fetchData = async () => {
      try {
        setLoading(true);
        const resp = await fetch(opts.url);

        if (!resp.ok) {
          setError(true);
          setData(undefined);
        }

        const json = await resp.json();

        setData(json);
        opts.onSuccess?.(json);
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
  const { url, onSuccess, skip } = opts;

  const fetchData = useCallback(async () => {
    if (skip) return;

    try {
      setLoading(true);
      const resp = await fetch(url);

      if (!resp.ok) {
        setError(true);
      }

      const json = await resp.json();
      onSuccess?.(json);

      return json as T;
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [url, onSuccess, skip]);

  return useMemo(
    () => ({ fetchData, loading, error }),
    [fetchData, loading, error]
  );
}
