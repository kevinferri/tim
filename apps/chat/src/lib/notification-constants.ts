// No imports on purpose -- shared as-is by both the Prisma model
// (notification-model.ts) and the client pagination hook
// (use-notifications.ts), neither of which should pull in the other's
// dependencies just to read a page size.
export const NOTIFICATION_LIMIT = 30;
