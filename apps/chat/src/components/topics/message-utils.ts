import { ChangeEvent } from "react";
import { find } from "linkifyjs";
import { CommandName, isCommandMessage, parseCommand } from "@tim/commands";

export function adjustHeight(
  target: ChangeEvent<HTMLTextAreaElement>["target"],
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

  // Uses the same linkify matcher as the rest of the UI so previews only
  // fire for genuine links -- the old hand-rolled check treated things like
  // "config.yml" as valid URLs.
  return find(message, "url", { defaultProtocol: "https" })
    .filter((match) => match.isLink)
    .map((match) => match.href);
}

export function isGiphy(url?: string) {
  if (!url) return false;
  return url.includes("giphy.com/media");
}

export function extractImageFromMessage(text: string) {
  const imageMatch = text.match(
    /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|png|svg|webp))/i,
  );
  if (imageMatch) return imageMatch[0];

  return undefined;
}

export function getYoutubeVideoFromUrl(url: string) {
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return undefined;
  }

  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|shorts\/))([^#&?]*)/,
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
  | { type: "mention"; value: string; id?: string }
  | { type: "topicLink"; value: string };

// Mention ids are bit-encoded into zero-width Unicode characters (not visible
// ones) so the payload has no rendered width and can't corrupt plain-text
// display or the composer's character-alignment with its highlight overlay.
const MENTION_ID_START = "\u2060"; // WORD JOINER
const MENTION_ID_END = "\u200d"; // ZERO WIDTH JOINER
const MENTION_ID_BIT0 = "\u200b"; // ZERO WIDTH SPACE
const MENTION_ID_BIT1 = "\u200c"; // ZERO WIDTH NON-JOINER
const MENTION_ID_BODY_PATTERN = `[${MENTION_ID_BIT0}${MENTION_ID_BIT1}]+`;
const MENTION_ID_PATTERN = `${MENTION_ID_START}(?<mentionIdBits>${MENTION_ID_BODY_PATTERN})${MENTION_ID_END}`;

function encodeMentionId(id: string): string {
  const bits = Array.from(id)
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("")
    .split("")
    .map((bit) => (bit === "1" ? MENTION_ID_BIT1 : MENTION_ID_BIT0))
    .join("");
  return `${MENTION_ID_START}${bits}${MENTION_ID_END}`;
}

function decodeMentionId(bits: string): string | undefined {
  if (bits.length === 0 || bits.length % 8 !== 0) return undefined;

  let id = "";
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits
      .slice(i, i + 8)
      .split("")
      .map((bit) => (bit === MENTION_ID_BIT1 ? "1" : "0"))
      .join("");
    id += String.fromCharCode(parseInt(byte, 2));
  }
  return id;
}

// Displays as "@Name" -- the invisible id payload takes no rendered width.
export function encodeMention(displayName: string, id: string): string {
  return `@${displayName}${encodeMentionId(id)}`;
}

// Self-describing via the invisible id payload, so no member list is needed
// to resolve one -- a plain "@Name" with no payload is skipped rather than
// guessed at.
export function extractMentionedUserIds(text: string): string[] {
  const pattern = new RegExp(
    `@[^\\s@#${MENTION_ID_START}]+${MENTION_ID_PATTERN}`,
    "g",
  );
  const ids = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const id = decodeMentionId(match.groups?.mentionIdBits ?? "");
    if (id) ids.add(id);
  }

  return Array.from(ids);
}

// One tokenizer backs both the message renderer and the composer highlight
// overlay, so they can't drift apart on what counts as a mention/topic link.
export function tokenizeMessage(
  text: string,
  mentionNames: string[],
  topicNames: string[],
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

  if (
    mentionNames.length === 0 &&
    topicNames.length === 0 &&
    !rest.includes(MENTION_ID_START)
  ) {
    tokens.push({ type: "text", value: rest });
    return tokens;
  }

  // ID-tagged mentions are matched first since they're self-describing and
  // don't need to appear in mentionNames (this also covers a since-renamed
  // member); a plain "@Name" still needs a mentionNames match.
  const patternParts: string[] = [
    `@(?<mention>[^\\s@#${MENTION_ID_START}]+)${MENTION_ID_PATTERN}`,
  ];
  if (mentionNames.length > 0) {
    patternParts.push(
      `@(?<mentionOld>${mentionNames.map(escapeRegExp).join("|")})\\b`,
    );
  }
  if (topicNames.length > 0) {
    patternParts.push(
      `#(?<topicLink>${topicNames.map(escapeRegExp).join("|")})\\b`,
    );
  }

  const pattern = new RegExp(patternParts.join("|"), "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rest))) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: rest.slice(lastIndex, match.index) });
    }

    if (match.groups?.mention !== undefined) {
      tokens.push({
        type: "mention",
        value: `@${match.groups.mention}`,
        id: decodeMentionId(match.groups.mentionIdBits ?? ""),
      });
    } else if (match.groups?.mentionOld !== undefined) {
      tokens.push({ type: "mention", value: match[0] });
    } else {
      tokens.push({ type: "topicLink", value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < rest.length) {
    tokens.push({ type: "text", value: rest.slice(lastIndex) });
  }

  return tokens;
}
