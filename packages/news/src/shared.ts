// Client-safe exports (no Node built-ins), for the chat app's browser code: `@tim/news/shared`.
export {
  POLL_INTERVAL_MINUTES,
  REFRESH_THROTTLE_MINUTES,
  STORY_LIFETIME_HOURS,
  storyCutoff,
} from "./schedule";
export {
  toNewsItemDto,
  type NewsItemDto,
  type NewsItemsCreatedPayload,
} from "./wire";
