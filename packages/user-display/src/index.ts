// A user's `name` (from Prisma's User model) is a nullable free-text
// field -- both apps independently derived a display-friendly first name
// from it (apps/chat in three places, apps/realtime-server for the /tim
// prompt), which had already produced one behavioral difference between
// them: some call sites handled a null/undefined name and some didn't.
// One implementation here instead.
//
// Named for what it's used for (the name shown everywhere -- messages,
// notifications, mentions), not for today's implementation (first name).
// When custom display names ship, this is the one place that changes --
// `displayName ?? getDisplayName(name)` -- rather than every call site.
export function getDisplayName(name?: string | null): string {
  return name?.split(" ")[0] ?? "";
}
