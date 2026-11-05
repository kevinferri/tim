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

// Own keys only, so ":constructor:" or ":__proto__:" can't hit Object.prototype.
function hasOwn(obj: object, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

// Returns undefined until loadEmojiData() has resolved.
export function emojiForShortcode(shortcode: string): string | undefined {
  if (!emojiData) return undefined;
  const { emojis, aliases } = emojiData;
  const key = shortcode.toLowerCase();
  const id = hasOwn(emojis, key)
    ? key
    : hasOwn(aliases, key)
      ? aliases[key]
      : hasOwn(EXTRA_ALIASES, key)
        ? EXTRA_ALIASES[key]
        : undefined;
  return id && hasOwn(emojis, id) ? emojis[id].skins[0]?.native : undefined;
}

// A shortcode can't follow a word char, so "12:30:45" and "re:x:" never match.
// Captured-prefix rather than lookbehind, which Safari < 16.4 can't parse.
const BOUNDARY = String.raw`(^|[^\w])`;
const CODE = "[a-z0-9_+-]";
const OPEN_PATTERN = new RegExp(`${BOUNDARY}:(${CODE}{2,})$`, "i");
const CLOSED_PATTERN = new RegExp(`${BOUNDARY}:(${CODE}+):$`, "i");
const ANY_PATTERN = new RegExp(`:(${CODE}+):`, "gi");

// Slack-style: an in-progress ":xx" (2+ chars) right before the caret.
export function findOpenShortcode(
  textBeforeCaret: string,
): { query: string; start: number } | undefined {
  const match = OPEN_PATTERN.exec(textBeforeCaret);
  if (!match) return undefined;
  return { query: match[2], start: match.index + match[1].length };
}

// A just-closed ":code:" right before the caret, if it's a known emoji.
export function findClosedShortcode(
  textBeforeCaret: string,
): { native: string; start: number } | undefined {
  const match = CLOSED_PATTERN.exec(textBeforeCaret);
  const native = match && emojiForShortcode(match[2]);
  if (!match || !native) return undefined;
  return { native, start: match.index + match[1].length };
}

export function replaceShortcodes(text: string): string {
  return text.replace(ANY_PATTERN, (match, code: string, offset: number) =>
    offset > 0 && /\w/.test(text[offset - 1])
      ? match
      : (emojiForShortcode(code) ?? match),
  );
}

type SearchIndexType = (typeof import("emoji-mart"))["SearchIndex"];
let searchIndexPromise: Promise<SearchIndexType> | undefined;

// Data is loaded before init: emoji-mart's init never rejects on a failed load,
// it just hangs. Reset on failure so the next search retries.
function getSearchIndex(): Promise<SearchIndexType> {
  searchIndexPromise ??= Promise.all([
    import("emoji-mart"),
    loadEmojiData(),
  ]).then(
    async ([{ init, SearchIndex }, data]) => {
      await init({ data });
      return SearchIndex;
    },
    (error) => {
      searchIndexPromise = undefined;
      throw error;
    },
  );
  return searchIndexPromise;
}

// Same search the emoji picker runs: matches id, name words, keywords and emoticons.
export async function searchEmojis(
  query: string,
  limit = 50,
): Promise<EmojiCandidate[]> {
  if (!query) return [];

  const SearchIndex = await getSearchIndex();
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
