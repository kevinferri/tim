"use client";

import { useState } from "react";
import { useEffectOnce } from "./use-effect-once";

function format(date: Date, options?: Intl.DateTimeFormatOptions) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaultOptions = {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "numeric",
  } as const;
  const opts = options ?? defaultOptions;

  return new Date(date).toLocaleDateString("en-US", { ...opts, timeZone });
}

/**
 * Forces the date to be formatted client side
 */
export function useDateFormatter(
  date?: Date,
  options?: Intl.DateTimeFormatOptions
) {
  const [d, setD] = useState<string>();
  useEffectOnce(() => setD(date ? format(date, options) : undefined));
  return d;
}
