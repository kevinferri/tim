// Consolidates each app's independently-derived (and inconsistently null-safe) first-name logic; named for its use (display name) rather than today's implementation, so `displayName ?? getDisplayName(name)` is the one call site that changes when custom display names ship.
export function getDisplayName(name?: string | null): string {
  return name?.split(" ")[0] ?? "";
}
