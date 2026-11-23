import { beforeEach, describe, expect, it } from "vitest";
import { useUnreadStore } from "./unread-topics-store";

const store = () => useUnreadStore.getState();

beforeEach(() => {
  useUnreadStore.setState({ unreadCircles: {}, clientOwnedCircles: {} });
});

describe("unread circles", () => {
  it("takes the server snapshot for circles the client hasn't flagged", () => {
    store().hydrateUnreadCircles({ a: true });
    expect(store().unreadCircles).toEqual({ a: true });

    store().hydrateUnreadCircles({ b: true });
    expect(store().unreadCircles).toEqual({ b: true });
  });

  it("keeps a live dot when a stale snapshot doesn't have it", () => {
    store().setCircleUnread("a", true);
    store().hydrateUnreadCircles({});
    expect(store().unreadCircles).toEqual({ a: true });
  });

  it("keeps a circle read locally when a stale snapshot says unread", () => {
    store().setCircleUnread("a", false);
    store().hydrateUnreadCircles({ a: true, b: true });
    expect(store().unreadCircles).toEqual({ b: true });
  });
});
