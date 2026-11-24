import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BETTING_WINDOW_MS,
  BlackjackTableView,
  Card,
  DEALER_DRAW_MS,
  RESULTS_MS,
  Rank,
  TURN_MS,
  applyAction,
  dealerDraw,
} from "@tim/casino";
import { SocketEvent } from "@tim/socket-types";
import { createMockSocket } from "../test/socket-mocks";
import { registerCasinoHandlers } from "./casino";
import { CasinoRegistry } from "../casino/registry";
import { InMemoryNetStore, NetStore } from "../casino/net-store";
import { isUserInCircle } from "../db/circles";
import { isGameEnabled } from "../db/circle-games";
import { shutdown } from "../shutdown";
import { TablePresence } from "../casino/presence";

vi.mock("../db/circles", () => ({ isUserInCircle: vi.fn() }));
vi.mock("../db/circle-games", () => ({ isGameEnabled: vi.fn() }));
// Pass-through spies so a test can make the engine throw once.
vi.mock("@tim/casino", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tim/casino")>();
  return {
    ...actual,
    applyAction: vi.fn(actual.applyAction),
    dealerDraw: vi.fn(actual.dealerDraw),
  };
});

const REF = { circleId: "c1", game: "blackjack" } as const;

type MockSocket = ReturnType<typeof createMockSocket>;

function seededRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function setup(
  netStore: NetStore = new InMemoryNetStore(),
  presence?: TablePresence,
) {
  const registry = new CasinoRegistry({
    netStore,
    rng: seededRng(),
    presence,
  });
  const connect = (userId: string) => {
    const socket = createMockSocket({
      id: userId,
      name: userId,
      displayName: userId,
      imageUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    registerCasinoHandlers({ socket, server: {} } as any, registry);
    return socket;
  };
  const table = () => registry.get(REF.circleId, REF.game)!;
  // Cards are dealt in the given order; padded so ensureShoe keeps it.
  const stackShoe = (...ranks: Rank[]) => {
    const cards: Card[] = [...ranks, ...Array(100).fill("5")].map((rank) => ({
      rank,
      suit: "hearts",
    }));
    table().shoe = cards;
  };
  return { registry, connect, table, stackShoe, netStore };
}

const watch = (s: MockSocket) => s.trigger(SocketEvent.TableWatch, REF);
const spectate = (s: MockSocket) =>
  s.trigger(SocketEvent.TableWatch, { ...REF, spectate: true });
const sit = (s: MockSocket, seat: unknown) =>
  s.trigger(SocketEvent.TableSit, { ...REF, seat });
const standUp = (s: MockSocket) => s.trigger(SocketEvent.TableStand, REF);
const act = (s: MockSocket, action: unknown) =>
  s.trigger(SocketEvent.TableAction, { ...REF, action });
const bet = (s: MockSocket, amount: number) => act(s, { type: "bet", amount });

function emitted(s: MockSocket, event: SocketEvent) {
  return s.emit.mock.calls.filter(([e]) => e === event).map(([, p]) => p);
}

function state(s: MockSocket): BlackjackTableView {
  return emitted(s, SocketEvent.TableState).at(-1) as BlackjackTableView;
}

function lastError(s: MockSocket): string | undefined {
  return (emitted(s, SocketEvent.TableError).at(-1) as any)?.message;
}

const ranks = (cards: (Card | null)[]) => cards.map((c) => c?.rank ?? null);

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(isUserInCircle).mockResolvedValue(true);
  vi.mocked(isGameEnabled).mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("watching", () => {
  it("sends the table state to a circle member", async () => {
    const { connect, registry } = setup();
    const a = connect("a");
    await watch(a);
    expect(state(a)).toMatchObject({
      circleId: "c1",
      game: "blackjack",
      phase: "waiting",
      msLeft: null,
      turn: null,
    });
    expect(state(a).seats).toHaveLength(9);
    expect(registry.tableCount()).toBe(1);
  });

  it("sends the same server id across updates and a table being recreated", async () => {
    const { connect, registry } = setup();
    const a = connect("a");
    await watch(a);
    const first = state(a).serverId;
    expect(first).toEqual(expect.any(String));
    await sit(a, 0);
    expect(state(a).serverId).toBe(first);

    // Last watcher gone: the table is dropped. A new one is a new table, not a restart.
    await a.trigger(SocketEvent.TableUnwatch, REF);
    expect(registry.tableCount()).toBe(0);
    const b = connect("b");
    await watch(b);
    expect(state(b).serverId).toBe(first);
  });

  function pendingMembership() {
    let resolve!: (isMember: boolean) => void;
    vi.mocked(isUserInCircle).mockReturnValueOnce(
      new Promise((r) => (resolve = r)),
    );
    return resolve;
  }

  it("drops a watch whose socket disconnected during the membership check", async () => {
    const { connect, registry } = setup();
    const a = connect("a");
    const resolve = pendingMembership();
    const watching = watch(a);
    await a.trigger(SocketEvent.Disconnecting);
    a.connected = false;
    resolve(true);
    await watching;

    expect(registry.tableCount()).toBe(0);
    expect(a.emit).not.toHaveBeenCalled();
  });

  it("applies an unwatch sent while a watch is still pending after the watch", async () => {
    const { connect, registry } = setup();
    const a = connect("a");
    const resolve = pendingMembership();
    const watching = watch(a);
    const unwatching = a.trigger(SocketEvent.TableUnwatch, REF);
    resolve(true);
    await Promise.all([watching, unwatching]);

    expect(registry.tableCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stands a seated user whose other tab's watch was dropped mid-check", async () => {
    const { connect, registry } = setup();
    const tab1 = connect("a");
    const tab2 = connect("a");
    await watch(tab1);
    await sit(tab1, 0);

    const resolve = pendingMembership();
    const watching = watch(tab2);
    await tab2.trigger(SocketEvent.Disconnecting);
    tab2.connected = false;
    resolve(true);
    await watching;

    await tab1.trigger(SocketEvent.Disconnecting);
    expect(registry.tableCount()).toBe(0);
  });

  it("rejects a circle that hasn't turned blackjack on", async () => {
    vi.mocked(isGameEnabled).mockResolvedValue(false);
    const { connect, registry } = setup();
    const a = connect("a");
    await watch(a);
    expect(isGameEnabled).toHaveBeenCalledWith({
      circleId: "c1",
      gameId: "blackjack",
    });
    expect(lastError(a)).toBe("This game isn't on in this circle");
    // The page checks the code, not the wording.
    expect(emitted(a, SocketEvent.TableError).at(-1)).toMatchObject({
      code: "game_off",
    });
    expect(registry.tableCount()).toBe(0);
  });

  it("sends a TableError when the watch checks fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(isUserInCircle).mockRejectedValueOnce(new Error("db down"));
    const { connect, registry } = setup();
    const a = connect("a");
    await watch(a);
    expect(lastError(a)).toBe("Something went wrong. Try again.");
    expect(registry.tableCount()).toBe(0);
    vi.mocked(console.error).mockRestore();

    await watch(a);
    expect(state(a).phase).toBe("waiting");
  });

  it("rejects non-members without creating a table", async () => {
    vi.mocked(isUserInCircle).mockResolvedValue(false);
    const { connect, registry } = setup();
    const a = connect("a");
    await watch(a);
    expect(lastError(a)).toBe("Not a member of this circle");
    expect(registry.tableCount()).toBe(0);
  });

  it.each([
    undefined,
    {},
    { circleId: 1, game: "blackjack" },
    { circleId: "c1", game: "poker" },
  ])("ignores malformed payload %j", async (payload) => {
    const { connect, registry } = setup();
    const a = connect("a");
    await a.trigger(SocketEvent.TableWatch, payload);
    expect(a.emit).not.toHaveBeenCalled();
    expect(registry.tableCount()).toBe(0);
  });

  it("lets a spectator see seats live but not sit", async () => {
    const { connect } = setup();
    const a = connect("a");
    const peek = connect("b");
    await spectate(peek);
    expect(state(peek).phase).toBe("waiting");

    await watch(a);
    await sit(a, 0);
    expect(state(peek).seats[0]?.occupant.userId).toBe("a");

    await sit(peek, 1);
    expect(lastError(peek)).toBe("You're not at this table");
    expect(state(a).seats[1]).toBeNull();
  });

  it("doesn't keep a player seated through their spectating tab", async () => {
    const { connect } = setup();
    const tab = connect("a");
    const peek = connect("a");
    await watch(tab);
    await sit(tab, 0);
    await spectate(peek);

    await tab.trigger(SocketEvent.Disconnecting);
    expect(state(peek).seats[0]).toBeNull();
  });

  it("won't seat anyone once the game is turned off, even on an open page", async () => {
    const { connect } = setup();
    const a = connect("a");
    await watch(a);
    vi.mocked(isGameEnabled).mockResolvedValue(false);

    await sit(a, 0);
    expect(emitted(a, SocketEvent.TableError).at(-1)).toMatchObject({
      code: "game_off",
    });
    expect(state(a).seats[0]).toBeNull();
  });

  it("requires watching before sitting, standing, or acting", async () => {
    const { connect } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await sit(b, 0);
    expect(lastError(b)).toBe("You're not at this table");
    await standUp(b);
    await bet(b, 50);
    expect(emitted(b, SocketEvent.TableError)).toHaveLength(3);
    expect(state(a).seats.every((s) => s === null)).toBe(true);
  });
});

describe("seats", () => {
  it("rejects a taken seat, a second seat, and invalid seats", async () => {
    const { connect } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    await sit(a, 0);
    expect(state(a).phase).toBe("betting");

    await sit(b, 0);
    expect(lastError(b)).toBe("Seat is taken");
    await sit(a, 1);
    expect(lastError(a)).toBe("You already have a seat");
    for (const seat of [-1, 9, 1.5, "2", null]) {
      await sit(b, seat);
      expect(lastError(b)).toBe("Invalid seat");
    }
    expect(state(b).seats.filter(Boolean)).toHaveLength(1);
  });

  it("seats players from the middle out when no seat is given, and says when the table is full", async () => {
    const { connect } = setup();
    const a = connect("a");
    await watch(a);
    const order: number[] = [];
    for (let i = 0; i < 9; i++) {
      const s = i === 0 ? a : connect(`p${i}`);
      if (i > 0) await watch(s);
      await sit(s, undefined);
      order.push(
        state(s).seats.findIndex((x) => x?.occupant.userId === s.data.user.id),
      );
    }
    expect(order).toEqual([4, 3, 5, 2, 6, 1, 7, 0, 8]);
    expect(state(a).seats.every(Boolean)).toBe(true);
    const late = connect("late");
    await watch(late);
    await sit(late, undefined);
    expect(lastError(late)).toBe("Table is full");
  });

  it("seats a player with their all-time up/down", async () => {
    const { connect } = setup();
    const a = connect("a");
    await watch(a);
    await sit(a, 3);
    expect(state(a).seats[3]).toMatchObject({
      seat: 3,
      occupant: { userId: "a", displayName: "a" },
      net: 0,
      bet: null,
      inRound: false,
      leaving: false,
      hands: [],
    });
  });
});

describe("a round", () => {
  it("plays a solo round from bet to results and back to betting", async () => {
    const { connect, stackShoe, netStore } = setup();
    const a = connect("a");
    await watch(a);
    stackShoe("10", "9", "8", "7", "K"); // player 18, dealer 9 + 7, draws K
    await sit(a, 0);
    expect(state(a).msLeft).toBeNull();

    await bet(a, 100);
    // Everyone seated has bet, so it deals immediately.
    let view = state(a);
    expect(view.phase).toBe("players");
    expect(view.turn).toEqual({ seat: 0, hand: 0 });
    expect(view.msLeft).toBe(TURN_MS);
    expect(view.turnActions).toEqual(["hit", "stand", "double"]);
    expect(view.seats[0]).toMatchObject({
      net: 0,
      bet: 100,
      inRound: true,
    });
    expect(view.seats[0]!.hands[0]).toMatchObject({ total: 18, bet: 100 });
    expect(ranks(view.dealer.cards)).toEqual(["9", null]);
    expect(view.dealer.total).toBe(9);

    await act(a, { type: "stand" });
    view = state(a);
    expect(view.phase).toBe("dealer");
    expect(view.msLeft).toBeNull();
    expect(ranks(view.dealer.cards)).toEqual(["9", "7"]);

    vi.advanceTimersByTime(DEALER_DRAW_MS);
    expect(ranks(state(a).dealer.cards)).toEqual(["9", "7", "K"]);
    expect(state(a).phase).toBe("dealer");

    vi.advanceTimersByTime(DEALER_DRAW_MS);
    view = state(a);
    expect(view.phase).toBe("results");
    expect(view.seats[0]!.hands[0]).toMatchObject({
      outcome: "win",
      payout: 200,
    });
    expect(view.seats[0]).toMatchObject({ net: 100, lastNet: 100 });
    await vi.waitFor(async () =>
      expect(await netStore.load("c1", "a")).toBe(100),
    );

    vi.advanceTimersByTime(RESULTS_MS);
    view = state(a);
    expect(view.phase).toBe("betting");
    expect(view.seats[0]).toMatchObject({
      net: 100,
      bet: null,
      inRound: false,
      hands: [],
    });
    expect(view.dealer).toEqual({ cards: [], total: null });
  });

  it("plays two players in seat order and rejects out-of-turn actions", async () => {
    const { connect, stackShoe } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    // a1 b1 up a2 b2 hole: a 18, b 17, dealer 9 + 8 = 17
    stackShoe("10", "10", "9", "8", "7", "8");
    await sit(b, 5);
    await sit(a, 2);

    await bet(b, 50);
    expect(state(a).phase).toBe("betting");
    expect(state(a).msLeft).toBe(BETTING_WINDOW_MS);
    await bet(a, 100);
    expect(state(a).phase).toBe("players");
    expect(state(a).turn).toEqual({ seat: 2, hand: 0 });

    const before = state(a);
    await act(b, { type: "hit" });
    expect(lastError(b)).toBe("It's not your turn");
    expect(state(a)).toEqual(before);

    await bet(a, 50);
    expect(lastError(a)).toBe("Betting is closed");

    await act(a, { type: "stand" });
    expect(state(a).turn).toEqual({ seat: 5, hand: 0 });
    await act(b, { type: "stand" });
    expect(state(a).phase).toBe("dealer");

    vi.advanceTimersByTime(DEALER_DRAW_MS);
    const view = state(b);
    expect(view.phase).toBe("results");
    expect(view.seats[2]).toMatchObject({ net: 100, lastNet: 100 });
    expect(view.seats[5]).toMatchObject({ net: 0, lastNet: 0 });
    expect(view.seats[5]!.hands[0].outcome).toBe("push");
  });

  it("deals at the end of the betting window with whoever bet", async () => {
    const { connect, stackShoe } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    stackShoe("10", "9", "8", "7");
    await sit(a, 0);
    await sit(b, 1);
    await bet(a, 100);

    vi.advanceTimersByTime(BETTING_WINDOW_MS - 1);
    expect(state(a).phase).toBe("betting");
    vi.advanceTimersByTime(1);

    const view = state(a);
    expect(view.phase).toBe("players");
    expect(view.seats[0]).toMatchObject({ inRound: true });
    expect(view.seats[1]).toMatchObject({
      inRound: false,
      hands: [],
      bet: null,
    });
    expect(view.seats[1]!.net).toBe(0);

    await bet(b, 100);
    expect(lastError(b)).toBe("Betting is closed");
  });

  it("validates bets", async () => {
    const { connect } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    await sit(a, 0);
    await sit(b, 1);

    await bet(a, 5);
    expect(lastError(a)).toBe("Bet must be a multiple of 5 from 10 to 100");
    await bet(a, 105);
    expect(lastError(a)).toMatch(/multiple of 5/);
    await bet(a, 11);
    expect(lastError(a)).toMatch(/multiple of 5/);
    await act(a, { type: "bet", amount: 10.5 });
    expect(lastError(a)).toBe("Invalid action");
    await act(a, { type: "surrender" });
    expect(lastError(a)).toBe("Invalid action");
    expect(state(a).seats[0]).toMatchObject({ bet: null });

    await bet(a, 50);
    await bet(a, 100);
    expect(lastError(a)).toBe("You already bet this round");
    expect(state(a).seats[0]).toMatchObject({ bet: 50 });
  });
});

describe("turn timer", () => {
  it("auto-stands on timeout and restarts after every action", async () => {
    const { connect, stackShoe } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    // a1 b1 up a2 b2 hole, then a's hit: a 5+6+2 = 13, b 18, dealer 17
    stackShoe("5", "10", "9", "6", "8", "8", "2");
    await sit(a, 0);
    await sit(b, 1);
    await bet(a, 50);
    await bet(b, 50);

    vi.advanceTimersByTime(15_000);
    await act(a, { type: "hit" });
    expect(state(a).turn).toEqual({ seat: 0, hand: 0 });
    expect(state(a).msLeft).toBe(TURN_MS);

    // Nothing times out until the fresh clock runs out.
    const statesAfterHit = emitted(a, SocketEvent.TableState).length;
    vi.advanceTimersByTime(TURN_MS - 1);
    expect(emitted(a, SocketEvent.TableState)).toHaveLength(statesAfterHit);
    vi.advanceTimersByTime(1);
    const view = state(a);
    expect(view.turn).toEqual({ seat: 1, hand: 0 });
    expect(view.msLeft).toBe(TURN_MS);
    expect(view.seats[0]!.hands[0].cards).toHaveLength(3);
  });

  it("restarts for a second split hand and stands all of a player's hands", async () => {
    const { connect, stackShoe } = setup();
    const a = connect("a");
    await watch(a);
    // 8 8 vs dealer 9 + 8; split hands get 3 and 2
    stackShoe("8", "9", "8", "8", "3", "2");
    await sit(a, 0);
    await bet(a, 50);
    await act(a, { type: "split" });
    expect(state(a).turn).toEqual({ seat: 0, hand: 0 });
    await act(a, { type: "stand" });
    expect(state(a).turn).toEqual({ seat: 0, hand: 1 });
    expect(state(a).msLeft).toBe(TURN_MS);

    vi.advanceTimersByTime(TURN_MS);
    expect(state(a).phase).toBe("dealer");
  });
});

describe("up/down", () => {
  it("records net and wagered across bet, split, double, and settle", async () => {
    const { connect, stackShoe, netStore } = setup();
    const recordSpy = vi.spyOn(netStore, "record");
    const a = connect("a");
    await watch(a);
    // 8 8 vs dealer 9 + 7; split → 8+3, 8+2; double hand 1 → +10 = 21; dealer draws K
    stackShoe("8", "9", "8", "7", "3", "2", "10", "K");
    await sit(a, 0);
    await bet(a, 100);
    await act(a, { type: "split" });
    await act(a, { type: "double" });
    expect(state(a).seats[0]!.hands[0]).toMatchObject({
      bet: 200,
      total: 21,
      doubled: true,
    });
    await act(a, { type: "stand" });

    vi.advanceTimersByTime(DEALER_DRAW_MS * 2);
    const view = state(a);
    expect(view.phase).toBe("results");
    expect(view.seats[0]).toMatchObject({ net: 300, lastNet: 300 });
    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith({
      circleId: "c1",
      userId: "a",
      game: "blackjack",
      net: 300,
      wagered: 300,
    });
    await vi.waitFor(async () =>
      expect(await netStore.load("c1", "a")).toBe(300),
    );
  });

  it("always offers double and split, with no stack to run out of", async () => {
    const netStore = new InMemoryNetStore();
    await netStore.record({
      circleId: "c1",
      userId: "a",
      game: "blackjack",
      net: -5_000,
      wagered: 5_000,
    });
    const { connect, stackShoe } = setup(netStore);
    const a = connect("a");
    await watch(a);
    stackShoe("8", "9", "8", "7");
    await sit(a, 0);
    expect(state(a).seats[0]!.net).toBe(-5_000);
    await bet(a, 100);
    expect(state(a).turnActions).toEqual(["hit", "stand", "double", "split"]);
  });

  it("keeps going down without any refill", async () => {
    const { connect, stackShoe } = setup();
    const a = connect("a");
    await watch(a);
    await sit(a, 0);
    for (const expected of [-100, -200]) {
      // 16 vs dealer 20: loses 100.
      stackShoe("10", "10", "6", "10");
      await bet(a, 100);
      await act(a, { type: "stand" });
      vi.advanceTimersByTime(DEALER_DRAW_MS * 2);
      expect(state(a).seats[0]!.net).toBe(expected);
      vi.advanceTimersByTime(RESULTS_MS);
    }
    expect(state(a).phase).toBe("betting");
  });

  it("waits for a settlement still being written before loading on sit", async () => {
    const netStore = new InMemoryNetStore();
    const record = netStore.record.bind(netStore);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    vi.spyOn(netStore, "record").mockImplementation(async (hand) => {
      await gate;
      await record(hand);
    });
    const { connect, stackShoe } = setup(netStore);
    const a = connect("a");
    await watch(a);
    await sit(a, 0);
    // 16 vs dealer 20: loses 100.
    stackShoe("10", "10", "6", "10");
    await bet(a, 100);
    await act(a, { type: "stand" });
    vi.advanceTimersByTime(DEALER_DRAW_MS * 2 + RESULTS_MS);
    await standUp(a);

    const sitting = sit(a, 0);
    release();
    await sitting;
    expect(state(a).seats[0]!.net).toBe(-100);
  });

  it("records nothing when standing up during betting", async () => {
    const { connect, netStore } = setup();
    const recordSpy = vi.spyOn(netStore, "record");
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    await sit(a, 0);
    await sit(b, 1);
    await bet(a, 100);
    await standUp(a);
    expect(state(b).seats[0]).toBeNull();
    // b alone, hasn't bet: the countdown is cancelled.
    expect(state(b).phase).toBe("betting");
    expect(state(b).msLeft).toBeNull();
    expect(recordSpy).not.toHaveBeenCalled();

    await sit(a, 0);
    expect(state(a).seats[0]!.net).toBe(0);
  });
});

describe("presence", () => {
  const fakePresence = () => ({
    seated: vi.fn(async () => {}),
    stood: vi.fn(async () => {}),
    restoreAll: vi.fn(async () => {}),
  });

  it("tells presence about a sit, but not a rejected one", async () => {
    const presence = fakePresence();
    const { connect } = setup(undefined, presence);
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    await sit(a, 0);
    await sit(b, 0);

    expect(presence.seated).toHaveBeenCalledTimes(1);
    expect(presence.seated).toHaveBeenCalledWith(
      expect.objectContaining({
        ...REF,
        user: expect.objectContaining({ id: "a" }),
      }),
    );
  });

  it("tells presence when a player stands, mid-round too, or disconnects", async () => {
    const presence = fakePresence();
    const { connect } = setup(undefined, presence);
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    await sit(a, 0);
    await sit(b, 1);

    await bet(a, 10);
    vi.advanceTimersByTime(BETTING_WINDOW_MS);
    await standUp(a);
    expect(presence.stood).toHaveBeenCalledWith({ ...REF, userId: "a" });

    await b.trigger(SocketEvent.Disconnecting);
    expect(presence.stood).toHaveBeenCalledWith({ ...REF, userId: "b" });
  });

  it("restores statuses on shutdown", async () => {
    const presence = fakePresence();
    const { registry } = setup(undefined, presence);
    await registry.shutdown();
    expect(presence.restoreAll).toHaveBeenCalled();
  });
});

describe("leaving", () => {
  it("stands a player up when their last socket disconnects, not before", async () => {
    const { connect, registry } = setup();
    const tab1 = connect("a");
    const tab2 = connect("a");
    await watch(tab1);
    await watch(tab2);
    await sit(tab1, 0);

    await tab1.trigger(SocketEvent.Disconnecting);
    expect(state(tab2).seats[0]).toMatchObject({ occupant: { userId: "a" } });

    await tab2.trigger(SocketEvent.Disconnecting);
    expect(registry.tableCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stands a player up on unwatch of their last socket", async () => {
    const { connect } = setup();
    const a = connect("a");
    const watcher = connect("w");
    await watch(a);
    await watch(watcher);
    await sit(a, 0);
    await a.trigger(SocketEvent.TableUnwatch, REF);
    expect(state(watcher).seats[0]).toBeNull();
    expect(state(watcher).phase).toBe("waiting");
  });

  it("still settles a player who leaves mid-round, then frees the seat", async () => {
    const { connect, stackShoe, netStore, registry } = setup();
    const recordSpy = vi.spyOn(netStore, "record");
    const a = connect("a");
    const watcher = connect("w");
    await watch(a);
    await watch(watcher);
    stackShoe("10", "9", "8", "8"); // a 18 vs dealer 17
    await sit(a, 0);
    await bet(a, 100);

    await a.trigger(SocketEvent.Disconnecting);
    let view = state(watcher);
    expect(view.phase).toBe("dealer");
    expect(view.seats[0]).toMatchObject({ leaving: true, inRound: true });

    vi.advanceTimersByTime(DEALER_DRAW_MS);
    view = state(watcher);
    expect(view.phase).toBe("results");
    expect(view.seats[0]!.hands[0].outcome).toBe("win");
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "a", net: 100, wagered: 100 }),
    );

    vi.advanceTimersByTime(RESULTS_MS);
    view = state(watcher);
    expect(view.seats[0]).toBeNull();
    expect(view.phase).toBe("waiting");
    expect(vi.getTimerCount()).toBe(0);

    await watcher.trigger(SocketEvent.TableUnwatch, REF);
    expect(registry.tableCount()).toBe(0);
  });

  it("returns to waiting and clears timers when the last player stands up", async () => {
    const { connect, registry } = setup();
    const a = connect("a");
    await watch(a);
    await sit(a, 0);
    await bet(a, 50);
    // Solo bet deals immediately; stand during betting needs a second seat.
    expect(state(a).phase).toBe("players");

    const b = connect("b");
    await watch(b);
    vi.advanceTimersByTime(TURN_MS);
    vi.advanceTimersByTime(DEALER_DRAW_MS * 10 + RESULTS_MS);
    expect(state(b).phase).toBe("betting");

    await sit(b, 1);
    await bet(b, 50);
    expect(state(b).msLeft).toBe(BETTING_WINDOW_MS);
    await standUp(b);
    await standUp(a);
    expect(state(b).phase).toBe("waiting");
    expect(vi.getTimerCount()).toBe(0);

    await a.trigger(SocketEvent.TableUnwatch, REF);
    await b.trigger(SocketEvent.TableUnwatch, REF);
    expect(registry.tableCount()).toBe(0);
  });
});

describe("shutdown", () => {
  function deferredNetStore() {
    const store = new InMemoryNetStore();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    vi.spyOn(store, "record").mockImplementation(() => gate);
    return { store, release };
  }

  it("cancels tables, waits for settle writes, then closes the pool and exits", async () => {
    const { store, release } = deferredNetStore();
    const { connect, stackShoe, registry } = setup(store);
    const a = connect("a");
    const watcher = connect("w");
    await watch(a);
    await watch(watcher);
    stackShoe("10", "9", "8", "8");
    await sit(a, 0);
    await bet(a, 100);
    await act(a, { type: "stand" });
    vi.advanceTimersByTime(DEALER_DRAW_MS); // settles; write is now in flight
    expect(state(a).phase).toBe("results");

    const order: string[] = [];
    const done = shutdown({
      registry,
      destroyDb: async () => {
        order.push("destroyDb");
      },
      exit: (code) => {
        order.push(`exit:${code}`);
      },
    });

    for (const s of [a, watcher]) {
      expect(emitted(s, SocketEvent.TableClosing)).toEqual([
        { circleId: "c1", game: "blackjack" },
      ]);
    }
    await Promise.resolve();
    expect(order).toEqual([]);

    order.push("settled");
    release();
    await done;
    expect(order).toEqual(["settled", "destroyDb", "exit:0"]);
  });

  it("starts no new round and rejects requests after shutdown begins", async () => {
    const { connect, registry } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await sit(a, 0);
    await watch(b);
    await sit(b, 1);
    await bet(a, 50); // betting window running

    await shutdown({ registry, destroyDb: async () => {}, exit: () => {} });
    const statesBefore = emitted(a, SocketEvent.TableState).length;
    vi.advanceTimersByTime(BETTING_WINDOW_MS * 2);
    expect(emitted(a, SocketEvent.TableState)).toHaveLength(statesBefore);
    expect(vi.getTimerCount()).toBe(0);

    await bet(b, 50);
    expect(lastError(b)).toBe("Table is closing");
    const c = connect("c");
    await watch(c);
    expect(lastError(c)).toBe("Table is closing");
  });

  it("stops waiting on a stuck settle write after the cap", async () => {
    const { store } = deferredNetStore();
    const { connect, stackShoe, registry } = setup(store);
    const a = connect("a");
    await watch(a);
    stackShoe("10", "9", "8", "8");
    await sit(a, 0);
    await bet(a, 100);
    await act(a, { type: "stand" });
    vi.advanceTimersByTime(DEALER_DRAW_MS);

    const exit = vi.fn();
    const done = shutdown({ registry, destroyDb: async () => {}, exit });
    await vi.advanceTimersByTimeAsync(5_000);
    await done;
    expect(exit).toHaveBeenCalledWith(0);
  });
});

describe("unexpected errors", () => {
  const boom = () => {
    throw new Error("boom");
  };

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore();
  });

  it("cancels the round and returns bets when a timer step throws", async () => {
    const { connect, stackShoe } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    // a1 b1 up a2 b2 hole: a 18, b 17, dealer 9 + 7 = 16, so the dealer draws
    stackShoe("10", "10", "9", "8", "7", "7");
    await sit(a, 0);
    await sit(b, 1);
    await bet(a, 100);
    await bet(b, 50);
    await act(a, { type: "stand" });
    await act(b, { type: "stand" });
    expect(state(a).phase).toBe("dealer");

    vi.mocked(dealerDraw).mockImplementationOnce(boom);
    expect(() => vi.advanceTimersByTime(DEALER_DRAW_MS)).not.toThrow();

    const view = state(a);
    expect(view.phase).toBe("betting");
    expect(view.seats[0]).toMatchObject({ net: 0, bet: null, hands: [] });
    expect(view.seats[1]).toMatchObject({ net: 0, bet: null, hands: [] });
    expect(lastError(a)).toMatch(/cancelled and bets were returned/);
    expect(lastError(b)).toMatch(/cancelled and bets were returned/);
    expect(console.error).toHaveBeenCalled();

    // The table keeps working afterwards.
    await bet(a, 50);
    expect(state(a).seats[0]).toMatchObject({ bet: 50 });
  });

  it("cancels a split round without recording when an action throws", async () => {
    const { connect, stackShoe } = setup();
    const a = connect("a");
    const leaver = connect("l");
    await watch(a);
    await watch(leaver);
    // a1 l1 up a2 l2 hole: a 8 8, l 20, dealer 9 + 7
    stackShoe("8", "10", "9", "8", "10", "7", "3", "2");
    await sit(a, 0);
    await sit(leaver, 1);
    await bet(a, 100);
    await bet(leaver, 100);
    await act(a, { type: "split" });
    await leaver.trigger(SocketEvent.Disconnecting);
    expect(state(a).seats[1]).toMatchObject({ leaving: true });

    vi.mocked(applyAction).mockImplementationOnce(boom);
    await act(a, { type: "double" });

    const view = state(a);
    expect(view.phase).toBe("betting");
    expect(view.seats[0]).toMatchObject({ net: 0, bet: null, hands: [] });
    // A leaving seat is freed rather than kept for the next round.
    expect(view.seats[1]).toBeNull();
    expect(emitted(a, SocketEvent.TableError)).toHaveLength(1);
  });

  it("tells the player when loading their up/down fails, without seating them", async () => {
    const netStore = new InMemoryNetStore();
    vi.spyOn(netStore, "load").mockRejectedValueOnce(new Error("db down"));
    const { connect } = setup(netStore);
    const a = connect("a");
    await watch(a);
    await expect(sit(a, 0)).resolves.toBeUndefined();
    expect(lastError(a)).toBe("Couldn't load your up/down. Try again.");
    expect(state(a).seats[0]).toBeNull();

    await sit(a, 0);
    expect(state(a).seats[0]).toMatchObject({ net: 0 });
  });

  it("still settles when the net store throws synchronously", async () => {
    const netStore = new InMemoryNetStore();
    vi.spyOn(netStore, "record").mockImplementation(boom);
    const { connect, stackShoe } = setup(netStore);
    const a = connect("a");
    await watch(a);
    stackShoe("10", "9", "8", "8");
    await sit(a, 0);
    await bet(a, 100);
    await act(a, { type: "stand" });
    vi.advanceTimersByTime(DEALER_DRAW_MS);

    expect(state(a).phase).toBe("results");
    expect(state(a).seats[0]).toMatchObject({ net: 100, lastNet: 100 });
    await vi.waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "casino: settle write failed",
        expect.any(Error),
      ),
    );
  });
});
