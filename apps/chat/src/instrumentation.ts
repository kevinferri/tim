export async function register() {
  // Long-running Node server only: not the edge runtime, and not `next build`.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { startSamePageCron } = await import("@/games/same-page/server");
  startSamePageCron();
}
