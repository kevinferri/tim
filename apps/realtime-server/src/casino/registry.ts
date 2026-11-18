import { randomInt } from "crypto";
import { Rng, TableGame } from "@tim/casino";
import { BlackjackTable } from "./blackjack-table";
import { ChipStore, InMemoryChipStore } from "./chip-store";
import { isLocalDev } from "../lib/is-local-dev";

export const cryptoRng: Rng = () => randomInt(0, 2 ** 32) / 2 ** 32;

const tableKey = (circleId: string, game: TableGame) => `${game}:${circleId}`;

export type CasinoRegistryDeps = { chipStore: ChipStore; rng: Rng };

// Tables live in this process's memory: scaling tim-ws past one instance needs Redis or sticky routing.
export class CasinoRegistry {
  private tables = new Map<string, BlackjackTable>();
  private pendingSettles = new Set<Promise<void>>();
  closing = false;

  constructor(readonly deps: CasinoRegistryDeps) {}

  get(circleId: string, game: TableGame) {
    return this.tables.get(tableKey(circleId, game));
  }

  getOrCreate(circleId: string, game: TableGame) {
    const existing = this.get(circleId, game);
    if (existing) return existing;
    const table = new BlackjackTable(circleId, {
      chipStore: this.deps.chipStore,
      rng: this.deps.rng,
      trackSettle: (write) => {
        this.pendingSettles.add(write);
        write.finally(() => this.pendingSettles.delete(write));
      },
      onIdle: () => {
        if (this.get(circleId, game) !== table) return;
        table.dispose();
        this.tables.delete(tableKey(circleId, game));
      },
    });
    this.tables.set(tableKey(circleId, game), table);
    return table;
  }

  tableCount() {
    return this.tables.size;
  }

  removeSocket(socketId: string) {
    for (const table of [...this.tables.values()]) {
      table.removeWatcher(socketId);
    }
  }

  /** Cancels every round in progress and waits (capped) for settle writes already started. */
  async shutdown(capMs = 5_000) {
    this.closing = true;
    for (const table of this.tables.values()) table.close();
    let cap: NodeJS.Timeout | undefined;
    await Promise.race([
      Promise.allSettled([...this.pendingSettles]),
      new Promise((resolve) => {
        cap = setTimeout(resolve, capMs);
      }),
    ]);
    clearTimeout(cap);
  }
}

export const casinoRegistry = new CasinoRegistry({
  // A deep stack locally, so testing never runs dry.
  chipStore: new InMemoryChipStore(isLocalDev() ? 100_000 : undefined),
  rng: cryptoRng,
});
