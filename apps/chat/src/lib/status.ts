// Statuses are stored as one string, "<emoji> <text>"; older ones may have no emoji.
export const DEFAULT_STATUS_EMOJI = "💬";

// One emoji: a pictograph plus any variation selector, skin tone or ZWJ-joined parts.
const LEADING_EMOJI =
  /^(\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic}️?)*)\s*/u;

export function splitStatus(status: string | null | undefined) {
  const value = status?.trim() ?? "";
  const match = value.match(LEADING_EMOJI);
  if (!match) return { emoji: DEFAULT_STATUS_EMOJI, text: value };
  return { emoji: match[1], text: value.slice(match[0].length) };
}

// Display form: older statuses without an emoji get the default one.
export function formatStatus(status: string) {
  const { emoji, text } = splitStatus(status);
  return `${emoji} ${text}`;
}

export function joinStatus(emoji: string, text: string) {
  return `${emoji} ${text.trim()}`;
}
