import { Cron } from "croner";
import { NFL_ATS_CRON, NFL_ATS_TIME_ZONE } from "../lib/schedule";
import { runNflAtsJobs } from "./jobs";

const RETRY_DELAYS_MS = [30_000, 120_000];

declare global {
  var nflAtsCron: Cron | undefined;
}

async function runWithRetry() {
  for (let attempt = 0; ; attempt++) {
    try {
      await runNflAtsJobs();
      return;
    } catch (err) {
      console.error("[nfl-ats] jobs run failed", err);
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) return;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/** Schedules the daily jobs and runs once now to catch up on anything missed while down. */
export function startNflAtsCron() {
  // Guards against a second register() in the same process (dev reloads).
  if (globalThis.nflAtsCron) return;

  globalThis.nflAtsCron = new Cron(
    NFL_ATS_CRON,
    { timezone: NFL_ATS_TIME_ZONE, protect: true },
    runWithRetry,
  );
  void runWithRetry();
}
