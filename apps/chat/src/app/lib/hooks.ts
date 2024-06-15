"use client";

import { useState, useEffect, useRef, useMemo } from "react";

const hasFocus = () => typeof document !== "undefined" && document.hasFocus();

type Args = {
  onFocus?: () => void;
  onBlur?: () => void;
};

export function useWindowFocus(args: Args = {}) {
  const [focused, setFocused] = useState(hasFocus);

  useEffect(() => {
    setFocused(hasFocus());

    const onFocus = () => {
      setFocused(true);
      args?.onFocus?.();
    };

    const onBlur = () => {
      setFocused(false);
      args?.onBlur?.();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [args]);

  return focused;
}

export function useEffectOnce(effect: () => void | (() => void)) {
  const destroyFunc = useRef<void | (() => void)>();
  const effectCalled = useRef(false);
  const renderAfterCalled = useRef(false);
  const [_, setVal] = useState<number>(0);

  if (effectCalled.current) {
    renderAfterCalled.current = true;
  }

  useEffect(() => {
    // only execute the effect first time around
    if (!effectCalled.current) {
      destroyFunc.current = effect();
      effectCalled.current = true;
    }

    // this forces one render after the effect is run
    setVal((val) => val + 1);

    return () => {
      // if the comp didn't render since the useEffect was called,
      // we know it's the dummy React cycle
      if (!renderAfterCalled.current) {
        return;
      }

      if (destroyFunc.current) {
        destroyFunc.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function usePrevious<T>(value: T) {
  const [current, setCurrent] = useState<T>(value);
  const [previous, setPrevious] = useState<T | null>(null);

  if (value !== current) {
    setPrevious(current);
    setCurrent(value);
  }

  return previous;
}

export function useTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions();
}

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
