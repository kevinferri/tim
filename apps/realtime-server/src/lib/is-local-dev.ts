// True outside "production" and "test" -- excludes "test" too so vitest
// (which sets NODE_ENV=test) still exercises the real network path in
// media-fetchers.test.ts / open-ai.test.ts instead of a local-dev fallback.
export function isLocalDev(): boolean {
  return !["production", "test"].includes(process.env.NODE_ENV ?? "");
}
