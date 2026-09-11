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
  | { type: "mention"; value: string; id?: string }
  | { type: "topicLink"; value: string };

// A mention carries the selected member's id invisibly right after the
// visible "@Name" text, so which of several same-named members was actually
// clicked survives into the stored message (see selectMention in
// topic-message-bar.tsx) instead of being re-guessed by name every time the
// message is rendered or notified on. The id is bit-encoded across zero-
// width Unicode format characters -- real fonts/browsers give these zero
// advance width -- rather than embedded as visible characters, which would
// show up as garbage text wherever the raw string is displayed unstyled
// (e.g. message-edit.tsx's plain textarea) and would break the composer's
// textarea/highlight-overlay character-for-character alignment (see
// message-highlight-overlay.tsx): a genuinely zero-width payload occupies
// the same rendered width whether or not the overlay repeats it, so the
// overlay can just render the plain "@Name" and stay in sync.
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

// Inserted by selectMention when a candidate is chosen from the dropdown --
// displays as "@Name" (the invisible id payload takes no rendered width).
export function encodeMention(displayName: string, id: string): string {
  return `@${displayName}${encodeMentionId(id)}`;
}

// Pulls the ids out of any ID-tagged mentions in a raw message, for
// send-time notification routing (see emitMessage in topic-message-bar.tsx)
// -- self-describing via the invisible payload, so no member list is needed
// to recognize one. A plain "@Name" typed without using the dropdown (or a
// mention from before this format existed) carries no id and is skipped
// rather than guessed at by name.
export function extractMentionedUserIds(text: string): string[] {
  const pattern = new RegExp(`@[^\\s@#${MENTION_ID_START}]+${MENTION_ID_PATTERN}`, "g");
  const ids = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const id = decodeMentionId(match.groups?.mentionIdBits ?? "");
    if (id) ids.add(id);
  }

  return Array.from(ids);
}

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

  if (
    mentionNames.length === 0 &&
    topicNames.length === 0 &&
    !rest.includes(MENTION_ID_START)
  ) {
    tokens.push({ type: "text", value: rest });
    return tokens;
  }

  // ID-tagged mentions are self-describing (any "@word" immediately
  // followed by the invisible id payload), so they're matched first and
  // don't need to appear in mentionNames -- this also covers a member
  // mentioned under a name that's since changed. Plain "@Name" (no id
  // payload) still only counts as a mention when it matches a real member,
  // same as before.
  const patternParts: string[] = [
    `@(?<mention>[^\\s@#${MENTION_ID_START}]+)${MENTION_ID_PATTERN}`,
  ];
  if (mentionNames.length > 0) {
    patternParts.push(
      `@(?<mentionOld>${mentionNames.map(escapeRegExp).join("|")})\\b`
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
