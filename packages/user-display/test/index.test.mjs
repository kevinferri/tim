import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DISPLAY_NAME_MAX_LENGTH,
  getInitialDisplayName,
} from "../dist/index.js";

test("getInitialDisplayName uses the first word of the name", () => {
  assert.equal(getInitialDisplayName("Kevin Ferri", "k@example.com"), "Kevin");
  assert.equal(
    getInitialDisplayName("  Kevin   Ferri", "k@example.com"),
    "Kevin",
  );
});

test("getInitialDisplayName falls back to the email local part", () => {
  for (const name of [undefined, null, "", "   "]) {
    assert.equal(getInitialDisplayName(name, "kev.f@example.com"), "kev.f");
  }
});

test("getInitialDisplayName caps the length", () => {
  const long = "x".repeat(DISPLAY_NAME_MAX_LENGTH + 10);
  assert.equal(
    getInitialDisplayName(long, "k@example.com").length,
    DISPLAY_NAME_MAX_LENGTH,
  );
});
