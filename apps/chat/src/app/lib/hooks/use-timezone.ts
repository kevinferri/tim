"use client";

export function useTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions();
}
