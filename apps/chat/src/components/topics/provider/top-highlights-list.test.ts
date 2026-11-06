import { describe, it, expect } from "vitest";
import { MessageProps } from "@/components/topics/message";
import {
  applyHighlightAdded,
  applyHighlightRemoved,
  rankTopHighlights,
} from "./top-highlights-list";
import { withHighlightAdded, withHighlightRemoved } from "./topic-query-cache";

const msg = (id: string, highlighters: string[], day = 1): MessageProps =>
  ({
    id,
    createdAt: new Date(2026, 10, day),
    highlights: highlighters.map((u) => ({ id: `${id}-${u}`, userId: u })),
  }) as MessageProps;

const added = (messageId: string, userId: string) =>
  withHighlightAdded({
    highlight: { id: `${messageId}-${userId}`, messageId, userId } as any,
    createdBy: { id: userId } as any,
  });

const removed = (messageId: string, userId: string) =>
  withHighlightRemoved({ messageId, userId });

const ids = (list: MessageProps[]) => list.map((m) => m.id);

describe("withHighlightAdded / withHighlightRemoved", () => {
  it("is idempotent and keeps identity when nothing changes", () => {
    const m = msg("a", ["u1"]);
    expect(added("a", "u1")(m)).toBe(m);
    expect(removed("a", "u2")(m)).toBe(m);
    expect(added("b", "u2")(m)).toBe(m);
  });

  it("adds and removes by user", () => {
    const m = added("a", "u2")(msg("a", ["u1"]));
    expect(m.highlights?.map((h) => h.userId)).toEqual(["u1", "u2"]);
    expect(removed("a", "u1")(m).highlights?.map((h) => h.userId)).toEqual([
      "u2",
    ]);
  });
});

describe("rankTopHighlights", () => {
  it("orders by count then newest, drops zero-count, trims to limit", () => {
    const list = [
      msg("old", ["u1"], 1),
      msg("none", []),
      msg("top", ["u1", "u2"], 1),
      msg("new", ["u1"], 3),
    ];
    expect(ids(rankTopHighlights(list, 2))).toEqual(["top", "new"]);
  });
});

describe("applyHighlightAdded", () => {
  it("re-ranks when the message is already listed", () => {
    // Ties on count after the add; b is newer so it ranks first.
    const list = [msg("a", ["u1", "u2"], 1), msg("b", ["u1"], 2)];
    const res = applyHighlightAdded(list, {
      messageId: "b",
      patch: added("b", "u3"),
      limit: 2,
    });
    expect(ids(res.list)).toEqual(["b", "a"]);
    expect(res.refetch).toBe(false);
  });

  it("promotes a known outsider that outranks the bottom and trims", () => {
    const list = [msg("a", ["u1", "u2"]), msg("b", ["u1"])];
    const res = applyHighlightAdded(list, {
      messageId: "c",
      patch: added("c", "u2"),
      knownMessage: msg("c", ["u1"], 5),
      limit: 2,
    });
    expect(ids(res.list)).toEqual(["c", "a"]);
    expect(res.refetch).toBe(false);
  });

  it("ignores a known outsider from before the period", () => {
    const list = [msg("a", ["u1"], 10)];
    const res = applyHighlightAdded(list, {
      messageId: "c",
      patch: added("c", "u1"),
      knownMessage: msg("c", [], 1),
      periodStart: new Date(2026, 10, 5),
      limit: 10,
    });
    expect(res.list).toBe(list);
    expect(res.refetch).toBe(false);
  });

  it("refetches when the message isn't loaded anywhere", () => {
    const list = [msg("a", ["u1"])];
    const res = applyHighlightAdded(list, {
      messageId: "zzz",
      patch: added("zzz", "u1"),
      limit: 10,
    });
    expect(res).toEqual({ list, refetch: true });
  });
});

describe("applyHighlightRemoved", () => {
  it("ignores messages outside the list", () => {
    const list = [msg("a", ["u1"])];
    const res = applyHighlightRemoved(list, {
      messageId: "b",
      patch: removed("b", "u1"),
      limit: 1,
    });
    expect(res).toEqual({ list, refetch: false });
  });

  it("drops a zero-count message from a short list without refetching", () => {
    const list = [msg("a", ["u1"]), msg("b", ["u1"])];
    const res = applyHighlightRemoved(list, {
      messageId: "a",
      patch: removed("a", "u1"),
      limit: 10,
    });
    expect(ids(res.list)).toEqual(["b"]);
    expect(res.refetch).toBe(false);
  });

  it("refetches when a full list loses a slot", () => {
    const list = [msg("a", ["u1"]), msg("b", ["u1"])];
    const res = applyHighlightRemoved(list, {
      messageId: "a",
      patch: removed("a", "u1"),
      limit: 2,
    });
    expect(ids(res.list)).toEqual(["b"]);
    expect(res.refetch).toBe(true);
  });

  it("refetches when a full list's member falls to the bottom", () => {
    const list = [msg("a", ["u1", "u2", "u3"]), msg("b", ["u1", "u2"])];
    const res = applyHighlightRemoved(list, {
      messageId: "a",
      patch: (m) => removed("a", "u3")(removed("a", "u2")(m)),
      limit: 2,
    });
    expect(ids(res.list)).toEqual(["b", "a"]);
    expect(res.refetch).toBe(true);
  });

  it("doesn't refetch when a full list's member stays above the bottom", () => {
    const list = [
      msg("a", ["u1", "u2", "u3"]),
      msg("b", ["u1", "u2"]),
      msg("c", ["u1"]),
    ];
    const res = applyHighlightRemoved(list, {
      messageId: "a",
      patch: removed("a", "u3"),
      limit: 3,
    });
    expect(res.refetch).toBe(false);
  });
});
