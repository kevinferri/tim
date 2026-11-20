import { pgClient } from "./db/client";
import { CasinoRegistry, casinoRegistry } from "./casino/registry";

export type ShutdownDeps = {
  registry: CasinoRegistry;
  destroyDb: () => Promise<void>;
  exit: (code: number) => void;
};

/** Cancels live tables, lets in-flight up/down writes finish, then closes the pool and exits. */
export async function shutdown(
  deps: ShutdownDeps = {
    registry: casinoRegistry,
    destroyDb: () => pgClient.destroy(),
    exit: (code) => process.exit(code),
  },
) {
  try {
    await deps.registry.shutdown();
    await deps.destroyDb();
  } catch (err) {
    console.error("shutdown failed", err);
  }
  deps.exit(0);
}

export function registerShutdown() {
  process.once("SIGTERM", () => void shutdown());
}
