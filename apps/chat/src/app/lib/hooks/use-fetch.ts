"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function useFetch<T>(url: string, opts: { skip?: boolean } = {}) {
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
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, opts.skip]);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}

export function useLazyFetch<T>(url: string) {
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

      return json as T;
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { loading, error, fetchData };
}
