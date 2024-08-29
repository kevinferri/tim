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
        opts.onSuccess?.();
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
  opts: { url: string; onSuccess?: (data: T) => void } = {
    url: "",
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { url, onSuccess } = opts;

  const fetchData = useCallback(async () => {
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
  }, [url, onSuccess]);

  return useMemo(
    () => ({ fetchData, loading, error }),
    [fetchData, loading, error]
  );
}
