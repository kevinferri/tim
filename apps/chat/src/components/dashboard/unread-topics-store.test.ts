import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENT_FLAG_GRACE_MS, useUnreadStore } from "./unread-topics-store";

const store = () => useUnreadStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  useUnreadStore.setState({ unreadCircles: {}, circleFlaggedAt: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("unread circles", () => {
  it("takes the server snapshot for circles the client hasn't flagged", () => {
    store().hydrateUnreadCircles({ a: true });
    expect(store().unreadCircles).toEqual({ a: true });

    store().hydrateUnreadCircles({ b: true });
    expect(store().unreadCircles).toEqual({ b: true });
  });

  it("keeps a just-lit dot when a stale snapshot doesn't have it", () => {
    store().setCircleUnread("a", true);
    store().hydrateUnreadCircles({});
    expect(store().unreadCircles).toEqual({ a: true });
  });

  it("keeps a just-read circle read when a stale snapshot says unread", () => {
    store().setCircleUnread("a", false);
    store().hydrateUnreadCircles({ a: true, b: true });
    expect(store().unreadCircles).toEqual({ b: true });
  });

  it("lets later snapshots win again: missed messages and reads elsewhere", () => {
    store().setCircleUnread("a", false);
    store().setCircleUnread("b", true);
    vi.advanceTimersByTime(CLIENT_FLAG_GRACE_MS);

    store().hydrateUnreadCircles({ a: true });
    expect(store().unreadCircles).toEqual({ a: true });
  });

  it("always keeps the current circle's client flag", () => {
    store().setCircleUnread("a", false);
    vi.advanceTimersByTime(CLIENT_FLAG_GRACE_MS);

    store().hydrateUnreadCircles({ a: true }, "a");
    expect(store().unreadCircles).toEqual({});
  });
});
