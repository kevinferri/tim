#!/usr/bin/env node
// Fills in apps/*/.env.local from apps/*/.env.example: generates random
// values for vars tagged "# auto", copies known-safe local defaults verbatim,
// and leaves vars that need a real third-party credential blank. Safe to
// rerun -- never overwrites a value that's already set, and backfills any
// var added to .env.example since .env.local was created.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseEnvLines,
  reconcileMissing,
  resolveShared,
} from "./lib/env-file.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const APPS = ["apps/chat", "apps/realtime-server"];
// Must end up byte-identical across every app's .env.local -- shared JWT
// verification + message encryption between apps/chat and apps/realtime-server.
const SHARED_KEYS = ["JWT_SECRET", "CRYPTO_KEY"];

function generateSecret() {
  return randomBytes(32).toString("base64");
}

function readEnvValues(filePath) {
  if (!existsSync(filePath)) return {};
  const values = {};
  for (const { key, value } of parseEnvLines(readFileSync(filePath, "utf8"))) {
    if (key) values[key] = value;
  }
  return values;
}

// Ensures .env.local exists (seeded from .env.example) and has every key
// .env.example currently declares, without touching any value already set.
function syncLocalWithExample(appDir) {
  const examplePath = path.join(appDir, ".env.example");
  const localPath = path.join(appDir, ".env.local");
  const exampleContent = readFileSync(examplePath, "utf8");

  if (!existsSync(localPath)) {
    writeFileSync(localPath, exampleContent);
  } else {
    const localContent = readFileSync(localPath, "utf8");
    const reconciled = reconcileMissing(localContent, exampleContent);
    if (reconciled !== localContent) writeFileSync(localPath, reconciled);
  }

  return localPath;
}

function main() {
  const appDirs = APPS.map((app) => path.join(ROOT, app));
  const localPaths = appDirs.map(syncLocalWithExample);

  // Resolve shared secrets once: reuse an existing value if any app already
  // has one set, otherwise generate a single fresh value for all apps.
  const sharedValues = {};
  for (const key of SHARED_KEYS) {
    const existingValues = localPaths.map((p) => readEnvValues(p)[key]);
    const resolved = resolveShared(existingValues, generateSecret);

    if (resolved.conflict) {
      console.warn(
        `Warning: ${key} differs between .env.local files -- leaving both as-is. ` +
          "These must match; fix manually.",
      );
      continue;
    }

    sharedValues[key] = resolved.value;
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
      // Keep the "# auto" tag so a later-cleared value still gets
      // regenerated on a future rerun instead of being misreported as an
      // optional/third-party var that's just blank.
      return `${line.key}=${value} # auto`;
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
