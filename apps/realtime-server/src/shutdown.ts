import { pgClient } from "./db/client";
import { CasinoRegistry, casinoRegistry } from "./casino/registry";

export type ShutdownDeps = {
  registry: CasinoRegistry;
  stopNews?: () => Promise<void>;
  destroyDb: () => Promise<void>;
  exit: (code: number) => void;
};

/** Cancels live tables, lets in-flight up/down and news writes finish, then closes the pool and exits. */
export async function shutdown(
  deps: ShutdownDeps = {
    registry: casinoRegistry,
    destroyDb: () => pgClient.destroy(),
    exit: (code) => process.exit(code),
  },
) {
  try {
    await Promise.all([deps.registry.shutdown(), deps.stopNews?.()]);
    await deps.destroyDb();
  } catch (err) {
    console.error("shutdown failed", err);
  }
  deps.exit(0);
}

export function registerShutdown({
  stopNews,
}: { stopNews?: () => Promise<void> } = {}) {
  process.once(
    "SIGTERM",
    () =>
      void shutdown({
        registry: casinoRegistry,
        stopNews,
        destroyDb: () => pgClient.destroy(),
        exit: (code) => process.exit(code),
      }),
  );
}
