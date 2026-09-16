#!/usr/bin/env node
// Fills in apps/*/.env.local from apps/*/.env.example: generates random
// values for vars tagged "# auto", copies known-safe local defaults verbatim,
// and leaves vars that need a real third-party credential blank. Safe to
// rerun -- never overwrites a value that's already set.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const APPS = ["apps/chat", "apps/realtime-server"];
// Must end up byte-identical across every app's .env.local -- shared JWT
// verification + message encryption between apps/chat and apps/realtime-server.
const SHARED_KEYS = ["JWT_SECRET", "CRYPTO_KEY"];

function generateSecret() {
  return randomBytes(32).toString("base64");
}

function parseEnvLines(content) {
  return content.split("\n").map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*?)(\s*#\s*auto\s*)?$/);
    if (!match) return { raw: line };
    const [, key, value, autoTag] = match;
    return { raw: line, key, value: value.trim(), auto: Boolean(autoTag) };
  });
}

function readEnvValues(filePath) {
  if (!existsSync(filePath)) return {};
  const values = {};
  for (const { key, value } of parseEnvLines(readFileSync(filePath, "utf8"))) {
    if (key) values[key] = value;
  }
  return values;
}

function loadOrInitLocal(appDir) {
  const examplePath = path.join(appDir, ".env.example");
  const localPath = path.join(appDir, ".env.local");

  if (!existsSync(localPath)) {
    writeFileSync(localPath, readFileSync(examplePath, "utf8"));
  }

  return localPath;
}

function main() {
  const appDirs = APPS.map((app) => path.join(ROOT, app));
  const localPaths = appDirs.map(loadOrInitLocal);

  // Resolve shared secrets once: reuse an existing value if any app already
  // has one set, otherwise generate a single fresh value for all apps.
  const sharedValues = {};
  for (const key of SHARED_KEYS) {
    const existing = localPaths
      .map((p) => readEnvValues(p)[key])
      .filter(Boolean);
    const distinct = new Set(existing);

    if (distinct.size > 1) {
      console.warn(
        `Warning: ${key} differs between .env.local files -- leaving both as-is. ` +
          "These must match; fix manually.",
      );
      continue;
    }

    sharedValues[key] = existing[0] ?? generateSecret();
  }

  const generated = [];
  const stillNeeded = [];

  for (const localPath of localPaths) {
    const lines = parseEnvLines(readFileSync(localPath, "utf8"));

    const updated = lines.map((line) => {
      if (!line.key || !line.auto) return line.raw;
      if (line.value) return line.raw; // already set, leave it

      const value = sharedValues[line.key] ?? generateSecret();
      generated.push(`${line.key} (${path.relative(ROOT, localPath)})`);
      return `${line.key}=${value}`;
    });

    writeFileSync(localPath, updated.join("\n"));

    for (const line of lines) {
      if (line.key && !line.auto && !line.value) {
        stillNeeded.push(`${line.key} (${path.relative(ROOT, localPath)})`);
      }
    }
  }

  if (generated.length > 0) {
    console.log("Generated:");
    generated.forEach((entry) => console.log(`  ${entry}`));
  } else {
    console.log("Nothing to generate -- all auto vars already set.");
  }

  if (stillNeeded.length > 0) {
    console.log(
      "\nStill blank (optional locally, or requires a real credential -- see the comment above each in .env.example):",
    );
    stillNeeded.forEach((entry) => console.log(`  ${entry}`));
  }
}

main();
