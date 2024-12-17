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

export function isGiphy(url?: string) {
  if (!url) return false;
  return url.includes("giphy.com/media");
}

export async function getFileFromUrl(
  url: string,
  name: string,
  defaultType = "image/jpeg"
) {
  const response = await fetch(url);
  const data = await response.blob();
  return new File([data], name, {
    type: data.type ?? defaultType,
  });
}

export function extractImageFromMessage(text: string) {
  const imageMatch = text.match(
    /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|png|svg|webp))/i
  );
  if (imageMatch) return imageMatch[0];

  return undefined;
}

export function getYoutubeVideoFromUrl(url: string) {
  if (!url.includes("youtube.com")) return undefined;

  const match = url.match(
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/
  );

  const id = match && match[7].length == 11 ? match[7] : false;

  if (!id) return undefined;
  return { id, videoUrl: `https://youtube.com/watch?v=${id}` };
}

export function getTwitchStreamFromUrl(url: string) {
  if (!url.includes("twitch.tv")) return undefined;

  const match = url.match(/^.*(twitch\.tv\/)([a-zA-Z0-9_]+)(\/.*)?$/);

  const id = match && match[2] ? match[2] : false;
  if (!id) return undefined;

  return { id, videoUrl: `https://twitch.tv/${id}` };
}

export function isValidCommand(message: string) {
  const command = message.split(" ")[0].toLowerCase();
  return ["/youtube", "/giphy", "/yt", "/tim"].includes(command);
}
