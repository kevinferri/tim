// Unseen-activity counts shown ahead of the tab title while the window is in the background,
// e.g. "(💬 2) (⭐ 1) Sandbox - General". Cleared when the window is focused again.
const counts = { messages: 0, highlights: 0 };
const BADGES = /^(?:\((?:💬|⭐) \d+\) )+/u;

function render() {
  // The rest of the title is whatever the page set, so navigation keeps working.
  const base = document.title.replace(BADGES, "");
  const badges = [
    counts.messages > 0 && `(💬 ${counts.messages})`,
    counts.highlights > 0 && `(⭐ ${counts.highlights})`,
  ].filter(Boolean);
  document.title = [...badges, base].join(" ");
}

function clear() {
  counts.messages = 0;
  counts.highlights = 0;
  render();
}

if (typeof window !== "undefined") {
  window.addEventListener("focus", clear);
}

export function bumpTitleBadge(kind: keyof typeof counts) {
  if (document.hasFocus()) return;
  counts[kind] += 1;
  render();
}
