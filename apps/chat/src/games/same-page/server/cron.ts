import { Cron } from "croner";
import { SAME_PAGE_CRON, SAME_PAGE_TIME_ZONE } from "../lib/schedule";
import { runSamePageJobs } from "./jobs";

const RETRY_DELAYS_MS = [30_000, 120_000];

declare global {
  var samePageCron: Cron | undefined;
}

async function runWithRetry() {
  for (let attempt = 0; ; attempt++) {
    try {
      await runSamePageJobs();
      return;
    } catch (err) {
      console.error("[same-page] jobs run failed", err);
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) return;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/** Schedules the weekday jobs and runs once now to catch up on anything missed while down. */
export function startSamePageCron() {
  // Guards against a second register() in the same process (dev reloads).
  if (globalThis.samePageCron) return;

  globalThis.samePageCron = new Cron(
    SAME_PAGE_CRON,
    { timezone: SAME_PAGE_TIME_ZONE, protect: true },
    runWithRetry,
  );
  void runWithRetry();
}
