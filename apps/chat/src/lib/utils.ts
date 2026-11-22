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

export function isEmojiOnly(str: string) {
  if (str.length > 13) return false;

  const stringToTest = str.replace(/ /g, "");
  const emojiRegex =
    /^(?:(?:\p{RI}\p{RI}|\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u{200D}\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*)|[\u{1f900}-\u{1f9ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}])+$/u;
  return emojiRegex.test(stringToTest) && Number.isNaN(Number(stringToTest));
}

// Query parameters that only track where a click came from; anything else (e.g. YouTube's v=) identifies the page.
const TRACKING_PARAM =
  /^(utm_.+|at_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|si|ref|ref_src|smid|cmpid)$/i;

/**
 * Readable label for a link in a message: no scheme, "www.", tracking
 * parameters or fragment, cut to `max` characters. The full URL stays the
 * link's href.
 */
export function shortUrlLabel(url: string, max = 40) {
  let parsed: URL;
  try {
    parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`,
    );
  } catch {
    return url;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  // News topic links are opaque Google redirects; name them once their stored preview has expired.
  if (
    host === "news.google.com" &&
    /^\/(rss\/)?articles\//.test(parsed.pathname)
  ) {
    return "Google News story";
  }
  let path = parsed.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // A bare "%" (e.g. /50%off) isn't a valid escape; show the path as-is.
  }
  path = path.replace(/\/+$/, "");
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) parsed.searchParams.delete(key);
  }
  const label = `${host}${path}${parsed.search}`;
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}
