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

// Arguments are server ids: "s2" after "s1" means the server restarted.
const seated = (serverId: string): PresenceEvent => ({
  type: "state",
  serverId,
  seated: true,
});
const standing = (serverId: string): PresenceEvent => ({
  type: "state",
  serverId,
  seated: false,
});
const disconnect: PresenceEvent = { type: "disconnect" };
const closing: PresenceEvent = { type: "closing" };

describe("table presence notices", () => {
  it("says the table restarted after a crash (new server, no closing)", () => {
    expect(run(seated("s1"), disconnect, standing("s2")).at(-1)).toBe(
      "restarted",
    );
  });

  it("stays quiet after a deploy, which announced itself before closing", () => {
    expect(
      run(seated("s1"), closing, disconnect, standing("s2")).at(-1),
    ).toBeNull();
  });

  it("says you were disconnected when only your connection dropped", () => {
    expect(run(seated("s1"), disconnect, standing("s1")).at(-1)).toBe(
      "disconnected",
    );
  });

  it("says you were disconnected once your seat is freed, after reconnecting mid-hand", () => {
    // Back while the hand is still on: the seat stays (leaving) until results free it.
    expect(
      run(seated("s1"), disconnect, seated("s1"), seated("s1"), standing("s1")),
    ).toEqual([null, null, null, null, "disconnected"]);
  });

  it("stays quiet when you stand up yourself", () => {
    expect(run(seated("s1"), standing("s1"))).toEqual([null, null]);
  });

  it("stays quiet when you weren't seated when the connection dropped", () => {
    expect(run(standing("s1"), disconnect, standing("s2")).at(-1)).toBeNull();
  });

  it("tells you once, not on every later update", () => {
    expect(
      run(seated("s1"), disconnect, standing("s2"), standing("s2")),
    ).toEqual([null, null, "restarted", null]);
  });

  it("forgets a closing once the table is back", () => {
    expect(
      run(
        seated("s1"),
        closing,
        disconnect,
        seated("s2"),
        disconnect,
        standing("s3"),
      ).at(-1),
    ).toBe("restarted");
  });
});
