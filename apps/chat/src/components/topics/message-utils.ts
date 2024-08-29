import { hydrateUrl, isValidUrl } from "@/lib/utils";
import { ChangeEvent } from "react";

export function adjustHeight(
  target: ChangeEvent<HTMLTextAreaElement>["target"]
) {
  target.style.height = "";
  target.style.height = `${target.scrollHeight + 0.5}px`;
}

export function truncateText(str: string, maxLength = 50) {
  const words = str.split(/\s+/);
  if (words.length <= maxLength) return str;
  return `${str.split(" ").splice(0, maxLength).join(" ")}...`;
}

export function getLinksFromMessage(message?: string) {
  if (!message) return [];

  const links = [];
  const words = message.split(/\s+/);

  for (let word of words) {
    if (word.match(/[A-Za-z]+/)) {
      const url = hydrateUrl(word);
      if (isValidUrl(url)) links.push(url);
    }
  }

  return links;
}
