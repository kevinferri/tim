import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BETTING_WINDOW_MS,
  BlackjackTableView,
  Card,
  DEALER_DRAW_MS,
  RESULTS_MS,
  Rank,
  STARTING_CHIPS,
  TURN_MS,
} from "@tim/casino";
import { SocketEvent } from "@tim/socket-types";
import { createMockSocket } from "../test/socket-mocks";
import { registerCasinoHandlers } from "./casino";
import { CasinoRegistry } from "../casino/registry";
import { ChipStore, InMemoryChipStore } from "../casino/chip-store";
import { isUserInCircle } from "../db/circles";
import { shutdown } from "../shutdown";

vi.mock("../db/circles", () => ({ isUserInCircle: vi.fn() }));

const REF = { circleId: "c1", game: "blackjack" } as const;

type MockSocket = ReturnType<typeof createMockSocket>;

function seededRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function setup(chipStore: ChipStore = new InMemoryChipStore()) {
  const registry = new CasinoRegistry({ chipStore, rng: seededRng() });
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
  return { registry, connect, table, stackShoe, chipStore };
}

const watch = (s: MockSocket) => s.trigger(SocketEvent.TableWatch, REF);
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

  it("requires watching before sitting, standing, or acting", async () => {
    const { connect } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await sit(b, 0);
    expect(lastError(b)).toBe("You're not at this table");
    await standUp(b);
    await bet(b, 10);
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

  it("seats a player with their chip balance", async () => {
    const { connect } = setup();
    const a = connect("a");
    await watch(a);
    await sit(a, 3);
    expect(state(a).seats[3]).toMatchObject({
      seat: 3,
      occupant: { userId: "a", displayName: "a" },
      stack: STARTING_CHIPS,
      bet: null,
      inRound: false,
      leaving: false,
      hands: [],
    });
  });
});

describe("a round", () => {
  it("plays a solo round from bet to results and back to betting", async () => {
    const { connect, stackShoe, chipStore } = setup();
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
      stack: 900,
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
    expect(view.seats[0]).toMatchObject({ stack: 1100, lastNet: 100 });
    await vi.waitFor(async () =>
      expect(await chipStore.load("c1", "a")).toBe(1100),
    );

    vi.advanceTimersByTime(RESULTS_MS);
    view = state(a);
    expect(view.phase).toBe("betting");
    expect(view.seats[0]).toMatchObject({
      stack: 1100,
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

    await bet(a, 10);
    expect(lastError(a)).toBe("Betting is closed");

    await act(a, { type: "stand" });
    expect(state(a).turn).toEqual({ seat: 5, hand: 0 });
    await act(b, { type: "stand" });
    expect(state(a).phase).toBe("dealer");

    vi.advanceTimersByTime(DEALER_DRAW_MS);
    const view = state(b);
    expect(view.phase).toBe("results");
    expect(view.seats[2]).toMatchObject({ stack: 1100, lastNet: 100 });
    expect(view.seats[5]).toMatchObject({ stack: 1000, lastNet: 0 });
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
    await bet(a, 20);

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
    expect(view.seats[1]!.stack).toBe(STARTING_CHIPS);

    await bet(b, 20);
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
    expect(lastError(a)).toMatch(/whole number from 10 to 500/);
    await bet(a, 501);
    expect(lastError(a)).toMatch(/whole number/);
    await act(a, { type: "bet", amount: 10.5 });
    expect(lastError(a)).toBe("Invalid action");
    await act(a, { type: "surrender" });
    expect(lastError(a)).toBe("Invalid action");
    expect(state(a).seats[0]).toMatchObject({ bet: null, stack: 1000 });

    await bet(a, 10);
    await bet(a, 20);
    expect(lastError(a)).toBe("You already bet this round");
    expect(state(a).seats[0]).toMatchObject({ bet: 10, stack: 990 });
  });
});

describe("turn timer", () => {
  it("auto-stands on timeout and restarts only when the turn moves", async () => {
    const { connect, stackShoe } = setup();
    const a = connect("a");
    const b = connect("b");
    await watch(a);
    await watch(b);
    // a1 b1 up a2 b2 hole, then a's hit: a 5+6+2 = 13, b 18, dealer 17
    stackShoe("5", "10", "9", "6", "8", "8", "2");
    await sit(a, 0);
    await sit(b, 1);
    await bet(a, 10);
    await bet(b, 10);

    vi.advanceTimersByTime(15_000);
    await act(a, { type: "hit" });
    expect(state(a).turn).toEqual({ seat: 0, hand: 0 });
    expect(state(a).msLeft).toBe(TURN_MS - 15_000);

    vi.advanceTimersByTime(TURN_MS - 15_000);
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
    await bet(a, 10);
    await act(a, { type: "split" });
    expect(state(a).turn).toEqual({ seat: 0, hand: 0 });
    await act(a, { type: "stand" });
    expect(state(a).turn).toEqual({ seat: 0, hand: 1 });
    expect(state(a).msLeft).toBe(TURN_MS);

    vi.advanceTimersByTime(TURN_MS);
    expect(state(a).phase).toBe("dealer");
  });
});

describe("chips", () => {
  it("tracks the stack across bet, split, double, and settle", async () => {
    const { connect, stackShoe, chipStore } = setup();
    const settleSpy = vi.spyOn(chipStore, "settle");
    const a = connect("a");
    await watch(a);
    // 8 8 vs dealer 9 + 7; split → 8+3, 8+2; double hand 1 → +10 = 21; dealer draws K
    stackShoe("8", "9", "8", "7", "3", "2", "10", "K");
    await sit(a, 0);
    await bet(a, 100);
    expect(state(a).seats[0]!.stack).toBe(900);

    await act(a, { type: "split" });
    expect(state(a).seats[0]!.stack).toBe(800);
    await act(a, { type: "double" });
    expect(state(a).seats[0]!.stack).toBe(700);
    expect(state(a).seats[0]!.hands[0]).toMatchObject({
      bet: 200,
      total: 21,
      doubled: true,
    });
    await act(a, { type: "stand" });

    vi.advanceTimersByTime(DEALER_DRAW_MS * 2);
    const view = state(a);
    expect(view.phase).toBe("results");
    expect(view.seats[0]).toMatchObject({ stack: 1300, lastNet: 300 });
    expect(settleSpy).toHaveBeenCalledTimes(1);
    expect(settleSpy).toHaveBeenCalledWith({
      circleId: "c1",
      userId: "a",
      game: "blackjack",
      net: 300,
    });
    await vi.waitFor(async () =>
      expect(await chipStore.load("c1", "a")).toBe(1300),
    );
  });

  it("does not offer double or split without enough chips", async () => {
    const chipStore = new InMemoryChipStore();
    await chipStore.settle({
      circleId: "c1",
      userId: "a",
      game: "blackjack",
      net: -850,
    });
    const { connect, stackShoe } = setup(chipStore);
    const a = connect("a");
    await watch(a);
    stackShoe("8", "9", "8", "7");
    await sit(a, 0);
    await bet(a, 100);
    expect(state(a).seats[0]!.stack).toBe(50);
    expect(state(a).turnActions).toEqual(["hit", "stand"]);
    await act(a, { type: "double" });
    expect(lastError(a)).toBe("You can't double now");
    await act(a, { type: "split" });
    expect(lastError(a)).toBe("You can't split now");
    expect(state(a).seats[0]!.stack).toBe(50);
  });

  it("refunds a bet when standing up during betting, with no chip write", async () => {
    const { connect, chipStore } = setup();
    const settleSpy = vi.spyOn(chipStore, "settle");
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
    expect(settleSpy).not.toHaveBeenCalled();

    await sit(a, 0);
    expect(state(a).seats[0]!.stack).toBe(STARTING_CHIPS);
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
    const { connect, stackShoe, chipStore, registry } = setup();
    const settleSpy = vi.spyOn(chipStore, "settle");
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
    expect(settleSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "a", net: 100 }),
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
    await bet(a, 10);
    // Solo bet deals immediately; stand during betting needs a second seat.
    expect(state(a).phase).toBe("players");

    const b = connect("b");
    await watch(b);
    vi.advanceTimersByTime(TURN_MS);
    vi.advanceTimersByTime(DEALER_DRAW_MS * 10 + RESULTS_MS);
    expect(state(b).phase).toBe("betting");

    await sit(b, 1);
    await bet(b, 10);
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
  function deferredChipStore() {
    const store = new InMemoryChipStore();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    vi.spyOn(store, "settle").mockImplementation(() => gate);
    return { store, release };
  }

  it("cancels tables, waits for settle writes, then closes the pool and exits", async () => {
    const { store, release } = deferredChipStore();
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
        {
          circleId: "c1",
          game: "blackjack",
          message: expect.stringMatching(/cancelled and bets were returned/),
        },
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
    await bet(a, 10); // betting window running

    await shutdown({ registry, destroyDb: async () => {}, exit: () => {} });
    const statesBefore = emitted(a, SocketEvent.TableState).length;
    vi.advanceTimersByTime(BETTING_WINDOW_MS * 2);
    expect(emitted(a, SocketEvent.TableState)).toHaveLength(statesBefore);
    expect(vi.getTimerCount()).toBe(0);

    await bet(b, 10);
    expect(lastError(b)).toBe("Table is closing");
    const c = connect("c");
    await watch(c);
    expect(lastError(c)).toBe("Table is closing");
  });

  it("stops waiting on a stuck settle write after the cap", async () => {
    const { store } = deferredChipStore();
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
