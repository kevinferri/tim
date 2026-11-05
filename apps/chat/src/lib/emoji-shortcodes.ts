import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

type EmojiMartData = {
  emojis: Record<
    string,
    {
      id: string;
      name: string;
      keywords: string[];
      skins: { native: string }[];
    }
  >;
  aliases: Record<string, string>;
};

const { emojis, aliases } = data as EmojiMartData;

export type EmojiCandidate = { shortcode: string; native: string };

// Slack-style names people type out of habit, mapped onto emoji-mart ids.
const EXTRA_ALIASES: Record<string, string> = {
  thumbsup: "+1",
  thumbsdown: "-1",
};

export function emojiForShortcode(shortcode: string): string | undefined {
  const key = shortcode.toLowerCase();
  const id = emojis[key] ? key : (aliases[key] ?? EXTRA_ALIASES[key]);
  return id ? emojis[id]?.skins[0]?.native : undefined;
}

// Lookbehind keeps "12:30:45" and "http://x:y:" from matching.
const SHORTCODE_PATTERN = /(?<![\w]):([a-z0-9_+-]+):/gi;

export function replaceShortcodes(text: string): string {
  return text.replace(
    SHORTCODE_PATTERN,
    (match, code: string) => emojiForShortcode(code) ?? match,
  );
}

let initPromise: Promise<void> | undefined;

// Same search the emoji picker runs: matches id, name words, keywords and emoticons.
export async function searchEmojis(
  query: string,
  limit = 50,
): Promise<EmojiCandidate[]> {
  if (!query) return [];

  initPromise ??= init({ data });
  await initPromise;

  const results: { id: string; skins: { native: string }[] }[] =
    (await SearchIndex.search(query, {
      maxResults: limit,
      caller: undefined,
    })) ?? [];

  return results.map((emoji) => ({
    shortcode: emoji.id,
    native: emoji.skins[0].native,
  }));
}
