import { randomInt } from "crypto";
import { Rng, TableGame } from "@tim/casino";
import { BlackjackTable } from "./blackjack-table";
import { NetStore, dbNetStore } from "./net-store";
import { ChatStore, TableChatLog, dbChatStore } from "./chat-store";

export const cryptoRng: Rng = () => randomInt(0, 2 ** 32) / 2 ** 32;

const tableKey = (circleId: string, game: TableGame) => `${game}:${circleId}`;

export type CasinoRegistryDeps = {
  netStore: NetStore;
  chatStore: ChatStore;
  rng: Rng;
};

// Tables live in this process's memory: scaling tim-ws past one instance needs Redis or sticky routing.
export class CasinoRegistry {
  private tables = new Map<string, BlackjackTable>();
  private pendingWrites = new Set<Promise<void>>();
  private pendingByUser = new Map<string, Set<Promise<void>>>();
  // Per table key, the last chat write; here so a recreated table's loads still wait for it.
  private chatWrites = new Map<string, Promise<void>>();
  closing = false;

  constructor(readonly deps: CasinoRegistryDeps) {}

  get(circleId: string, game: TableGame) {
    return this.tables.get(tableKey(circleId, game));
  }

  getOrCreate(circleId: string, game: TableGame) {
    const existing = this.get(circleId, game);
    if (existing) return existing;
    const table = new BlackjackTable(circleId, {
      netStore: this.deps.netStore,
      chatLog: this.chatLog(circleId, game),
      rng: this.deps.rng,
      trackSettle: (userId, write) => this.track(circleId, userId, write),
      onIdle: () => {
        if (this.get(circleId, game) !== table) return;
        table.dispose();
        this.tables.delete(tableKey(circleId, game));
      },
    });
    this.tables.set(tableKey(circleId, game), table);
    return table;
  }

  private chatLog(circleId: string, game: TableGame): TableChatLog {
    const key = tableKey(circleId, game);
    const ref = { circleId, game };
    const { chatStore } = this.deps;
    return {
      write: (line) => {
        const write = (this.chatWrites.get(key) ?? Promise.resolve())
          .then(() => chatStore.add(ref, line))
          .catch((err) =>
            console.error("casino: table chat write failed", err),
          );
        this.chatWrites.set(key, write);
        this.pendingWrites.add(write);
        write.finally(() => {
          this.pendingWrites.delete(write);
          if (this.chatWrites.get(key) === write) this.chatWrites.delete(key);
        });
      },
      recent: async () => {
        await this.chatWrites.get(key);
        return chatStore.recent(ref);
      },
    };
  }

  private track(circleId: string, userId: string, write: Promise<void>) {
    const key = `${circleId}:${userId}`;
    const mine = this.pendingByUser.get(key) ?? new Set();
    this.pendingByUser.set(key, mine.add(write));
    this.pendingWrites.add(write);
    write.finally(() => {
      this.pendingWrites.delete(write);
      mine.delete(write);
      if (mine.size === 0 && this.pendingByUser.get(key) === mine)
        this.pendingByUser.delete(key);
    });
  }

  /** Resolves once this user's up/down writes in flight have landed, so a load sees them. */
  async writesSettled(circleId: string, userId: string) {
    const mine = this.pendingByUser.get(`${circleId}:${userId}`);
    if (mine) await Promise.allSettled([...mine]);
  }

  tableCount() {
    return this.tables.size;
  }

  removeSocket(socketId: string) {
    for (const table of [...this.tables.values()]) {
      table.removeWatcher(socketId);
    }
  }

  /** Cancels every round in progress and waits (capped) for settle and chat writes already started. */
  async shutdown(capMs = 5_000) {
    this.closing = true;
    for (const table of this.tables.values()) table.close();
    let cap: NodeJS.Timeout | undefined;
    await Promise.race([
      Promise.allSettled([...this.pendingWrites]),
      new Promise((resolve) => {
        cap = setTimeout(resolve, capMs);
      }),
    ]);
    clearTimeout(cap);
  }
}

export const casinoRegistry = new CasinoRegistry({
  netStore: dbNetStore,
  chatStore: dbChatStore,
  rng: cryptoRng,
});
