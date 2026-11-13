/**
 * Answer matching for Same Page.
 * Formatting: ignore case, spacing, punctuation, simple plurals.
 * Typos: edit-distance threshold for short tokens.
 * Same meaning: small synonym map (expand later).
 * Guardrail: known near-homographs stay distinct (cat vs car).
 */

const SYNONYMS: Record<string, string> = {
  fries: "frenchfries",
  frenchfries: "frenchfries",
  frenchfry: "frenchfries",
  rubberband: "rubberband",
  rubberbands: "rubberband",
  paperclip: "paperclip",
  paperclips: "paperclip",
};

// Pairs that look close but must never merge.
const DISTINCT_PAIRS: Array<[string, string]> = [["cat", "car"]];

const NUMBER_WORDS = new Map(
  [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ]
    .map((word, n): [string, number] => [word, n])
    .concat(
      [
        "twenty",
        "thirty",
        "forty",
        "fifty",
        "sixty",
        "seventy",
        "eighty",
        "ninety",
      ].map((word, i): [string, number] => [word, (i + 2) * 10]),
    ),
);

const ORDINALS = new Map([
  ["first", "1st"],
  ["second", "2nd"],
  ["third", "3rd"],
  ["fourth", "4th"],
  ["fifth", "5th"],
  ["sixth", "6th"],
  ["seventh", "7th"],
  ["eighth", "8th"],
  ["ninth", "9th"],
  ["tenth", "10th"],
  ["eleventh", "11th"],
  ["twelfth", "12th"],
]);

/** Spelled-out numbers as digits: "twenty one" \u2192 "21", "a hundred" \u2192 "100", "second" \u2192 "2nd". */
function numbersToDigits(words: string[]): string[] {
  const out: string[] = [];
  let total = 0;
  let current = 0;
  let inNumber = false;

  const flush = () => {
    if (inNumber) out.push(String(total + current));
    total = 0;
    current = 0;
    inNumber = false;
  };

  for (const [i, word] of words.entries()) {
    const next = words[i + 1];
    const value = NUMBER_WORDS.get(word);
    // "a hundred" / "a thousand": the "a" is the number one.
    if (word === "a" && (next === "hundred" || next === "thousand")) {
      continue;
    } else if (value !== undefined) {
      current += value;
      inNumber = true;
    } else if (word === "hundred") {
      current = (inNumber ? current : 1) * 100;
      inNumber = true;
    } else if (word === "thousand") {
      total += (inNumber ? current : 1) * 1000;
      current = 0;
      inNumber = true;
    } else {
      flush();
      out.push(ORDINALS.get(word) ?? word);
    }
  }
  flush();
  return out;
}

function stripFormatting(raw: string): string {
  const words = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return numbersToDigits(words).join("");
}

function depluralize(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith("ses") || token.endsWith("xes") || token.endsWith("zes")) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function canonicalize(raw: string): string {
  const stripped = stripFormatting(raw);
  const base = depluralize(stripped);
  return SYNONYMS[base] ?? SYNONYMS[stripped] ?? base;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cur =
        a[i] === b[j] ? row[j] : 1 + Math.min(row[j], row[j + 1], prev);
      row[j] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function areDistinctHomographs(a: string, b: string): boolean {
  return DISTINCT_PAIRS.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x),
  );
}

/** Max edit distance allowed for typo merge, scaled by length. */
function typoThreshold(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

/**
 * Stable match key for clustering. Two answers match when their keys are equal
 * after formatting/synonym canonicalization, or when keys are within typo distance
 * and not a guarded distinct pair. For typo merges we map both to the
 * lexicographically smaller key so clusters converge.
 */
export function toMatchKey(text: string): string {
  return canonicalize(text.trim());
}

export function answersMatch(a: string, b: string): boolean {
  const ka = toMatchKey(a);
  const kb = toMatchKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (areDistinctHomographs(ka, kb)) return false;
  const distance = levenshtein(ka, kb);
  const threshold = typoThreshold(Math.min(ka.length, kb.length));
  return distance > 0 && distance <= threshold;
}

/** Resolve a cluster key for a set of raw answers (union-find style merge). */
export function clusterMatchKeys(texts: string[]): Map<string, string> {
  const keys = texts.map(toMatchKey);
  const parent = new Map<string, string>();

  function find(k: string): string {
    let cur = k;
    while (parent.get(cur) && parent.get(cur) !== cur) {
      cur = parent.get(cur)!;
    }
    return cur;
  }

  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    // Prefer lexicographically smaller as root for stability.
    if (ra < rb) parent.set(rb, ra);
    else parent.set(ra, rb);
  }

  for (const k of keys) {
    if (!parent.has(k)) parent.set(k, k);
  }

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (answersMatch(texts[i], texts[j])) {
        union(keys[i], keys[j]);
      }
    }
  }

  const out = new Map<string, string>();
  for (let i = 0; i < texts.length; i++) {
    out.set(texts[i], find(keys[i]));
  }
  return out;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isValidAnswerText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return countWords(trimmed) <= 3;
}
