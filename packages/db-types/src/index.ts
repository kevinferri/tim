// Generated from apps/chat/prisma/schema.prisma (the single source of truth
// for the DB schema). Re-exports Prisma's generated model types so
// apps/realtime-server can type its Knex queries against the real schema
// instead of hand-rolling row/arg shapes that can silently drift from it.
export type {
  User,
  Circle,
  Topic,
  Message,
  Highlight,
  TopicHistory,
} from "@prisma/client";
