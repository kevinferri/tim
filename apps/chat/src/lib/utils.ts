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
  const stringToTest = str.replace(/ /g, "");
  const emojiRegex =
    /^(?:(?:\p{RI}\p{RI}|\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u{200D}\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*)|[\u{1f900}-\u{1f9ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}])+$/u;
  return emojiRegex.test(stringToTest) && Number.isNaN(Number(stringToTest));
}
