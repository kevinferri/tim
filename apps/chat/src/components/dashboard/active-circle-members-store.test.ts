import { describe, it, expect, beforeEach } from "vitest";
import {
  __useActiveCircleMembersStore as useStore,
  ActiveUser,
} from "./active-circle-members-store";

function makeUser(overrides: Partial<ActiveUser> = {}): ActiveUser {
  return {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    imageUrl: null,
    createdAt: new Date(),
    status: null,
    lastStatusUpdate: null,
    state: { isIdle: false, isTyping: false },
    ...overrides,
  };
}

beforeEach(() => {
  useStore.setState({ topicMap: {}, pendingSelf: {} });
});

describe("addSelfToTopic", () => {
  it("adds an optimistic placeholder to a topic with no existing presence", () => {
    const self = makeUser();
    useStore.getState().addSelfToTopic("topic-1", "circle-1", self);

    const { topicMap, pendingSelf } = useStore.getState();
    expect(topicMap["topic-1"]).toEqual({
      circleId: "circle-1",
      activeUsers: [self],
    });
    expect(pendingSelf["topic-1"]).toBe(self);
  });

  it("keeps the authoritative entry when self already arrived before the optimistic call", () => {
    const authoritative = makeUser({
      state: { isIdle: true, isTyping: false },
    });
    useStore.setState({
      topicMap: {
        "topic-1": { circleId: "circle-1", activeUsers: [authoritative] },
      },
    });

    const optimistic = makeUser({ state: { isIdle: false, isTyping: false } });
    useStore.getState().addSelfToTopic("topic-1", "circle-1", optimistic);

    expect(useStore.getState().topicMap["topic-1"].activeUsers).toEqual([
      authoritative,
    ]);
  });
});

describe("setTopicPresence ordering", () => {
  it("preserves existing avatar order and appends only genuinely new users", () => {
    const alice = makeUser({ id: "alice" });
    const bob = makeUser({ id: "bob" });
    useStore.setState({
      topicMap: {
        "topic-1": { circleId: "circle-1", activeUsers: [alice, bob] },
      },
    });

    const carol = makeUser({ id: "carol" });
    // Server order (e.g. room-join order) differs from our local order --
    // alice/bob should hold their positions, carol appends at the end.
    useStore.getState().setTopicPresence("topic-1", {
      circleId: "circle-1",
      activeUsers: [carol, bob, alice],
    });

    expect(
      useStore.getState().topicMap["topic-1"].activeUsers.map((u) => u.id),
    ).toEqual(["alice", "bob", "carol"]);
  });

  it("clears pendingSelf once a broadcast confirms our own join", () => {
    const self = makeUser();
    useStore.getState().addSelfToTopic("topic-1", "circle-1", self);

    useStore.getState().setTopicPresence("topic-1", {
      circleId: "circle-1",
      activeUsers: [self],
    });

    expect(useStore.getState().pendingSelf["topic-1"]).toBeUndefined();
  });

  it("keeps our optimistic entry through a snapshot that raced ahead of our own join confirmation", () => {
    const self = makeUser({ id: "self-id" });
    useStore.getState().addSelfToTopic("topic-1", "circle-1", self);

    const someoneElse = makeUser({ id: "other-id" });
    // Triggered by someone else joining/leaving before our room:join has
    // round-tripped -- the server doesn't know about us yet.
    useStore.getState().setTopicPresence("topic-1", {
      circleId: "circle-1",
      activeUsers: [someoneElse],
    });

    const ids = useStore
      .getState()
      .topicMap["topic-1"].activeUsers.map((u) => u.id);
    expect(ids).toContain("self-id");
    expect(useStore.getState().pendingSelf["topic-1"]).toBe(self);
  });
});

describe("removeSelfFromTopic", () => {
  it("drops self and clears pendingSelf when leaving before the join is confirmed", () => {
    const self = makeUser({ id: "self-id" });
    useStore.getState().addSelfToTopic("topic-1", "circle-1", self);

    useStore.getState().removeSelfFromTopic("topic-1", "self-id");

    expect(useStore.getState().topicMap["topic-1"].activeUsers).toEqual([]);
    expect(useStore.getState().pendingSelf["topic-1"]).toBeUndefined();
  });

  it("stops a late leave-triggered broadcast from re-adding self via a stale pendingSelf", () => {
    const self = makeUser({ id: "self-id" });
    useStore.getState().addSelfToTopic("topic-1", "circle-1", self);
    useStore.getState().removeSelfFromTopic("topic-1", "self-id");

    // The leave's own topic:userJoinedOrLeft broadcast arrives after we've
    // already left, correctly excluding us.
    useStore.getState().setTopicPresence("topic-1", {
      circleId: "circle-1",
      activeUsers: [],
    });

    expect(useStore.getState().topicMap["topic-1"].activeUsers).toEqual([]);
  });
});
