import { test } from "node:test";
import assert from "node:assert/strict";
import { CommandName, toCommandName } from "../dist/index.js";

test("toCommandName returns the CommandName for every known value", () => {
  for (const name of Object.values(CommandName)) {
    assert.equal(toCommandName(name), name);
  }
});

test("toCommandName returns undefined for unknown values", () => {
  assert.equal(toCommandName("unknown"), undefined);
  assert.equal(toCommandName(""), undefined);
  // Aliases resolve at parse time; the column only ever holds canonical names.
  assert.equal(toCommandName("gif"), undefined);
  assert.equal(toCommandName("GIPHY"), undefined);
});

test("toCommandName returns undefined for null and undefined", () => {
  assert.equal(toCommandName(null), undefined);
  assert.equal(toCommandName(undefined), undefined);
});
