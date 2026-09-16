// Pure parsing/reconciliation logic for setup-env.mjs, split out so it's
// testable without touching the filesystem (see setup-env.test.mjs).

export function parseEnvLines(content) {
  return content.split("\n").map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*?)(\s*#\s*auto\s*)?$/);
    if (!match) return { raw: line };
    const [, key, value, autoTag] = match;
    return { raw: line, key, value: value.trim(), auto: Boolean(autoTag) };
  });
}

// Appends any KEY present in .env.example but missing entirely from an
// existing .env.local (e.g. a var added to .env.example in a later change),
// so a rerun on a pre-existing .env.local picks it up instead of silently
// staying without it forever.
export function reconcileMissing(localContent, exampleContent) {
  const existingKeys = new Set(
    parseEnvLines(localContent)
      .map((line) => line.key)
      .filter(Boolean),
  );

  const missing = parseEnvLines(exampleContent).filter(
    (line) => line.key && !existingKeys.has(line.key),
  );

  if (missing.length === 0) return localContent;

  const additions = [
    "",
    "# --- added by pnpm setup:env (new in .env.example) ---",
    ...missing.map((line) => line.raw),
  ];

  return `${localContent.replace(/\n+$/, "")}\n${additions.join("\n")}\n`;
}

// Resolves a var that must end up byte-identical across every app's
// .env.local (e.g. JWT_SECRET): reuse an existing value if any app already
// has one set (they must agree), otherwise generate a single fresh value
// shared by all. Returns { conflict: true } instead of a value when the
// apps already disagree, so the caller can warn and leave both alone.
export function resolveShared(existingValues, generate) {
  const existing = existingValues.filter(Boolean);
  const distinct = new Set(existing);

  if (distinct.size > 1) return { conflict: true };

  return { conflict: false, value: existing[0] ?? generate() };
}
