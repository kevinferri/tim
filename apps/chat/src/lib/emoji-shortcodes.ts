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

let emojiData: EmojiMartData | undefined;
let dataPromise: Promise<EmojiMartData> | undefined;

// Lazy so the dataset stays out of the initial bundle; shared with the picker.
export function loadEmojiData(): Promise<EmojiMartData> {
  dataPromise ??= import("@emoji-mart/data").then(
    (mod) => (emojiData = mod.default as EmojiMartData),
    (error) => {
      dataPromise = undefined;
      throw error;
    },
  );
  return dataPromise;
}

export type EmojiCandidate = { shortcode: string; native: string };

// Slack-style names people type out of habit, mapped onto emoji-mart ids.
const EXTRA_ALIASES: Record<string, string> = {
  thumbsup: "+1",
  thumbsdown: "-1",
};

// Returns undefined until loadEmojiData() has resolved.
export function emojiForShortcode(shortcode: string): string | undefined {
  if (!emojiData) return undefined;
  const { emojis, aliases } = emojiData;
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

  const { init, SearchIndex } = await import("emoji-mart");
  initPromise ??= init({ data: loadEmojiData });
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
