import { ChangeEvent } from "react";
import { find } from "linkifyjs";
import { CommandName, isCommandMessage, parseCommand } from "@tim/commands";

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

  // Same matcher message-text.tsx already uses (via linkify-react) to decide
  // what's clickable in the message body -- reusing it here means a preview
  // only fires for text the UI itself treats as a link. The previous
  // hand-rolled version (any word with a letter, accepted as a URL if its
  // last dot-segment was 2+ chars) had no real TLD check, so ordinary
  // technical words like "config.yml" or "package.json" parsed as "valid
  // URLs" and triggered a real preview fetch/scrape for text that was never
  // a link.
  return find(message, "url", { defaultProtocol: "https" })
    .filter((match) => match.isLink)
    .map((match) => match.href);
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
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return undefined;
  }

  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|shorts\/))([^#&?]*)/
  );

  const id = match && match[1].length === 11 ? match[1] : undefined;

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
  return isCommandMessage(message);
}

export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripLeadingEmoji(str: string) {
  return str
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Modifier}️‍]+\s*/gu, "")
    .trim();
}

export type MessageToken =
  | { type: "text"; value: string }
  | { type: "command"; value: string; name: CommandName }
  | { type: "mention"; value: string }
  | { type: "topicLink"; value: string };

// Splits a raw message into ordered, whitespace-preserving segments so one
// tokenizer can back both the sent-message renderer (message-text.tsx) and
// the live composer highlight overlay (topic-message-bar.tsx) -- each just
// maps the same tokens to its own visual treatment (clickable elements vs.
// plain colored spans), instead of keeping two separate regexes that could
// drift out of sync on what counts as a mention/topic link.
export function tokenizeMessage(
  text: string,
  mentionNames: string[],
  topicNames: string[]
): MessageToken[] {
  if (!text) return [];

  const command = parseCommand(text);
  const tokens: MessageToken[] = [];
  let rest = text;

  if (command) {
    const parts = text.split(" ");
    tokens.push({ type: "command", value: parts[0], name: command.name });
    rest = parts.slice(1).join(" ");
    if (rest) tokens.push({ type: "text", value: " " });
  }

  if (!rest) return tokens;

  if (mentionNames.length === 0 && topicNames.length === 0) {
    tokens.push({ type: "text", value: rest });
    return tokens;
  }

  const patternParts: string[] = [];
  if (mentionNames.length > 0) {
    patternParts.push(
      `@(?<mention>${mentionNames.map(escapeRegExp).join("|")})\\b`
    );
  }
  if (topicNames.length > 0) {
    patternParts.push(
      `#(?<topicLink>${topicNames.map(escapeRegExp).join("|")})\\b`
    );
  }

  const pattern = new RegExp(patternParts.join("|"), "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rest))) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: rest.slice(lastIndex, match.index) });
    }

    tokens.push({
      type: match.groups?.mention ? "mention" : "topicLink",
      value: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < rest.length) {
    tokens.push({ type: "text", value: rest.slice(lastIndex) });
  }

  return tokens;
}
