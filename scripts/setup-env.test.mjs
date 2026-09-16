import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseEnvLines,
  reconcileMissing,
  resolveShared,
} from "./lib/env-file.mjs";

test("parseEnvLines extracts key/value/auto from a KEY=value line", () => {
  const [line] = parseEnvLines("FRONTEND_URL=http://localhost:3000");

  assert.equal(line.key, "FRONTEND_URL");
  assert.equal(line.value, "http://localhost:3000");
  assert.equal(line.auto, false);
});

test("parseEnvLines detects a trailing '# auto' tag on a blank value", () => {
  const [line] = parseEnvLines("JWT_SECRET= # auto");

  assert.equal(line.key, "JWT_SECRET");
  assert.equal(line.value, "");
  assert.equal(line.auto, true);
});

test("parseEnvLines keeps the '# auto' tag on a line with a generated value", () => {
  // Regression: setup-env.mjs writes generated values back as "KEY=value # auto"
  // (not bare "KEY=value") specifically so a later-cleared secret is still
  // recognized as auto-generatable on the next run, instead of being
  // misreported as a blank optional/third-party var.
  const [line] = parseEnvLines("JWT_SECRET=abc123 # auto");

  assert.equal(line.value, "abc123");
  assert.equal(line.auto, true);
});

test("parseEnvLines preserves comment and blank lines verbatim, keyless", () => {
  const [comment, blank] = parseEnvLines("# a comment\n");

  assert.equal(comment.key, undefined);
  assert.equal(comment.raw, "# a comment");
  assert.equal(blank.raw, "");
});

test("reconcileMissing appends a key present in .env.example but absent from .env.local", () => {
  const local = "FRONTEND_URL=http://localhost:3000\n";
  const example = "FRONTEND_URL=http://localhost:3000\nNEW_VAR=\n";

  const result = reconcileMissing(local, example);

  assert.match(result, /NEW_VAR=/);
  assert.match(result, /added by pnpm setup:env/);
});

test("reconcileMissing leaves .env.local untouched when nothing new is in .env.example", () => {
  const local = "FRONTEND_URL=http://localhost:3000\n";
  const example = "FRONTEND_URL=http://localhost:9999\n"; // different value, same key

  assert.equal(reconcileMissing(local, example), local);
});

test("reconcileMissing never alters an already-set value", () => {
  const local = "JWT_SECRET=already-set\n";
  const example = "JWT_SECRET= # auto\nNEW_VAR=\n";

  const result = reconcileMissing(local, example);

  assert.match(result, /^JWT_SECRET=already-set/);
  assert.match(result, /NEW_VAR=/);
});

test("resolveShared generates a fresh value when no app has one set", () => {
  const result = resolveShared([undefined, ""], () => "generated");

  assert.deepEqual(result, { conflict: false, value: "generated" });
});

test("resolveShared reuses an existing value instead of generating a new one", () => {
  const result = resolveShared(["existing", undefined], () => "generated");

  assert.deepEqual(result, { conflict: false, value: "existing" });
});

test("resolveShared flags a conflict when apps already disagree", () => {
  const result = resolveShared(["value-a", "value-b"], () => "generated");

  assert.equal(result.conflict, true);
});
