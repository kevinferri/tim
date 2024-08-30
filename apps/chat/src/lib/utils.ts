import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hydrateUrl(url: string) {
  return url.indexOf("://") === -1 ? "https://" + url : url;
}

export function isValidUrl(url?: string | null) {
  if (!url) return false;
  let _url;

  try {
    _url = new URL(url);
  } catch (e) {
    return false;
  }

  const hasPrefix = _url.protocol === "http:" || _url.protocol === "https:";
  const splitted = _url.hostname.split(".");
  const hasDomain =
    splitted.length > 1 && splitted[splitted.length - 1].length > 1;

  return hasPrefix && hasDomain;
}

export function toBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

export function getTimeZone() {
  if (typeof window === "undefined") return undefined;
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
