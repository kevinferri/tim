import { describe, expect, it } from "vitest";
import {
  initialPresence,
  nextPresence,
  type PresenceEvent,
  type PresenceNotice,
} from "./table-presence";

/** Runs events from the start and returns the notice each one produced. */
function run(...events: PresenceEvent[]): PresenceNotice[] {
  let state = initialPresence;
  return events.map((event) => {
    const next = nextPresence(state, event);
    state = next.state;
    return next.notice;
  });
}

const seated = (tableId: string): PresenceEvent => ({
  type: "state",
  tableId,
  seated: true,
});
const standing = (tableId: string): PresenceEvent => ({
  type: "state",
  tableId,
  seated: false,
});
const disconnect: PresenceEvent = { type: "disconnect" };
const closing: PresenceEvent = { type: "closing" };

describe("table presence notices", () => {
  it("says the table restarted after a crash (new table, no closing)", () => {
    expect(run(seated("t1"), disconnect, standing("t2")).at(-1)).toBe(
      "restarted",
    );
  });

  it("stays quiet after a deploy, which announced itself before closing", () => {
    expect(
      run(seated("t1"), closing, disconnect, standing("t2")).at(-1),
    ).toBeNull();
  });

  it("says you were disconnected when only your connection dropped", () => {
    expect(run(seated("t1"), disconnect, standing("t1")).at(-1)).toBe(
      "disconnected",
    );
  });

  it("stays quiet when you stand up yourself", () => {
    expect(run(seated("t1"), standing("t1"))).toEqual([null, null]);
  });

  it("stays quiet when you weren't seated when the connection dropped", () => {
    expect(run(standing("t1"), disconnect, standing("t2")).at(-1)).toBeNull();
  });

  it("tells you once, not on every later update", () => {
    expect(
      run(seated("t1"), disconnect, standing("t2"), standing("t2")),
    ).toEqual([null, null, "restarted", null]);
  });

  it("forgets a closing once the table is back", () => {
    expect(
      run(
        seated("t1"),
        closing,
        disconnect,
        seated("t2"),
        disconnect,
        standing("t3"),
      ).at(-1),
    ).toBe("restarted");
  });
});
