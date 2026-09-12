// Re-exports Prisma's generated model types from apps/chat/prisma/schema.prisma (the single source of truth) so Knex queries elsewhere can be typed against the real schema instead of hand-rolled shapes that can drift from it.
export type {
  User,
  Circle,
  Topic,
  Message,
  Highlight,
  TopicHistory,
} from "@prisma/client";
