# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js/TypeScript Socket.IO server (`tim-chat-server`) for Tim's real-time features: messaging, rooms (topics/circles), presence, typing/status activity, highlights, notifications, and slash commands. Data lives in Postgres, accessed with Knex. This app owns no schema or migrations: `apps/chat`'s `prisma/schema.prisma` is the source of truth, and `src/db/` is this app's only interface to it. Type Knex queries with the model types from `@tim/db-types` (e.g. `pgClient<Message>("messages")`) instead of hand-rolled shapes, so a schema change surfaces as a typecheck failure here.

## Commands

- `pnpm watch` — dev server (nodemon + ts-node) with env from `.env.local`. The root `pnpm dev` runs this alongside the chat app.
- `pnpm test` — vitest. Database tests run against the same embedded Postgres test instance as `apps/chat` (`vitest.global-setup.mts` → `apps/chat/scripts/test-db.js`), and test files run serially because they share tables.
- `pnpm lint` — eslint (flat config in `eslint.config.mjs`; typescript-eslint recommended rules, not type-checked).
- `npx tsc --noEmit` — typecheck.
- `pnpm build` — CI only. It compiles to `dist/`, then runs `pnpm install --prod`, which strips devDependencies across the whole workspace; don't run it locally (`pnpm install` undoes it). The Dockerfile compiles with `npx tsc` and doesn't use this script.
- `pnpm start` — run the compiled server from `dist/app.js` (production).

## Architecture

### Entry point and connection lifecycle

`src/app.ts` creates a plain HTTP server (with a `/api/ping` health check) and attaches Socket.IO at path `/ws/`. `src/middleware.ts` runs on every connection: it verifies the JWT from `socket.handshake.auth.token` (minted by the chat app with `JWT_SECRET`), then sets `socket.data.user` to the decoded user plus an initial activity state (`getInitialActiveUserState()` in `src/lib/user-change-handler.ts`). Unauthenticated sockets are rejected before any handler runs. `socket.data.user`'s shape is `SocketUser` in `src/lib/socket.ts`.

`src/event-handlers/main.ts` is the hub. It re-exports `SocketEvent` from `@tim/socket-types` (add new wire events there, not here) and `registerEventHandlers(server)` wires up every handler module in `src/event-handlers/` on each connection, plus `any.ts` for logging all events. A `socket.use` guard re-checks `socket.data.user` on every event. Every handler takes `{ socket, server }: HandlerArgs`. A new handler module must be registered in `registerEventHandlers`.

### Rooms and authorization

`src/event-handlers/rooms.ts` is central to authorization and presence. Room keys are `"<roomType>::<id>"` (`RoomType.Topic | Circle | User`, via `toRoomKey`/`parseRoomKey`). Joining a room checks DB membership (`isUserInTopic` in `src/db/topics.ts`, `isUserInCircle` in `src/db/circles.ts`) before `socket.join`. After that, being in the room is the authorization: most handlers either use `registerRoomEvent()` (registers a handler that silently ignores sockets not in the room derived from the payload) or call `getRoomKeyOrFail()` directly. Use one of these for new handlers instead of trusting client-supplied ids.

Presence: joining/leaving a topic room re-broadcasts that topic's active users to its parent circle room (`emitUserChangeInTopic`); joining a circle room sends the joining user the active-user map for every topic in the circle (`emitUserJoinedCircle`). A user with several tabs has several sockets, so presence dedupes by user id.

### Messages and slash commands

`src/event-handlers/messages.ts` handles send/edit/delete/shuffleGif. Message text is encrypted at rest with `@tim/crypto` (re-exported from `src/lib/encryption.ts`) and decrypted only when emitted. On send, `executeCommand()` (`src/lib/command-handler.ts`) parses a leading `/command` with `parseCommand` from `@tim/commands` and runs its executor from `commandExecutors`, which returns a `mediaUrl` to attach (Giphy/YouTube in `src/lib/media-fetchers.ts`, the `/tim` AI reply in `src/lib/open-ai.ts`). `commandExecutors` is a `Record<CommandName, …>`, so a new command is added to `@tim/commands` first (name + aliases) and then the typechecker requires its executor here.

### User activity and notifications

`src/event-handlers/user-activity.ts` updates `socket.data.user.state` (idle/typing/status) via `src/lib/user-change-handler.ts` and re-emits presence. Image-expand, link-click, and mention activity create notifications through `src/lib/notifications.ts` (`emitNotification`, `emitMentionNotifications`).

### Casino tables

`src/casino/` runs live game tables (blackjack today, one per circle) in memory. `table.ts` is the game-agnostic base (seats, watchers, one phase timer, broadcast); `blackjack-table.ts` drives the `@tim/casino` engine through betting → players → dealer → results; `registry.ts` creates tables on first watch and drops them when nobody is watching or seated; `net-store.ts` is the only place a player's all-time up/down is read (`load`, on sit) or written (`record`, once per player when a round settles, into `casino_player_stats` via `src/db/casino-stats.ts`). There's no bankroll: everyone starts at 0, and bets are capped only by the table limits. Handlers are in `src/event-handlers/casino.ts`: `TableWatch` checks circle membership and that the game is on for the circle (`circle_games`), and sit/stand/act require the socket to already be watching. Watchers are tracked on the table, not in Socket.IO rooms. When a user's last watching socket goes away, they stand up. `src/shutdown.ts` is the only `SIGTERM` handler: it cancels every round (watchers get `TableClosing`), waits up to 5 s for settle writes already in flight, then closes the DB pool and exits.

### News feeds

This is the only place feeds are fetched. `src/news/poller.ts` runs on a 30 s timer started in `src/app.ts`. Each tick claims due feeds (`news_feeds.nextFetchAt`) followed by a circle that has News on and someone in the chat, meaning a socket in one of its topic rooms (circle rooms don't count: every open tab joins all its circles). `FOR UPDATE SKIP LOCKED` keeps two instances from fetching the same feed. A fetched feed is due again in an hour, whether it succeeded or failed, so a circle nobody has open costs nothing. `refreshCircle` makes a circle's feeds due now, skipping any fetched in the last 15 minutes. It runs when someone opens a topic in the circle (`handleJoinRoom`) and on `NewsRefresh` (the News panel opening or staying open, or a source being added). It also counts that circle as active for the next tick. New items are stored once per feed (`news_items`, unique on feed + guid) and `NewsItemsCreated` is emitted to each following circle's room. Only what `selectFreshItems` picks is stored: the newest 50 stories from the last 72 hours, since some feeds rank by relevance rather than date. Undated and future-dated stories are skipped. The feed hosts a story for 72 hours from its publish date (`STORY_LIFETIME_HOURS`), and every 15 minutes the poller deletes expired ones; a deleted story can't come back as new, because nothing published before the cutoff is ever stored. Feeds no circle follows are kept (they're tiny) and simply not polled. `src/shutdown.ts` stops the poller: the tick finishes its current batch, claims no more, and shutdown waits for it. Adding and removing sources happens in the chat app; `NewsSourcesChanged` is only a refetch ping relayed between a circle's sockets.

### Data flow pattern

Validate the payload → authorize via room membership (above) → run the DB query/mutation in `src/db/` → emit the result to the room with `server.to(roomKey).emit(...)`.

### Tests

Handler tests use the Socket.IO doubles in `src/test/socket-mocks.ts` (`createMockSocket(...).trigger(event, payload)`); DB tests use `src/test/db.ts`. Tests sit next to the code as `*.test.ts`.

## Environment variables

`WS_PORT`, `FRONTEND_URL` (CORS origin), `JWT_SECRET`, `DATABASE_URL`, `DATABASE_SSL_CERT` (base64 CA cert, production only), `CRYPTO_KEY` (base64 32-byte key, see `packages/crypto`), `GIPHY_KEY`, `YOUTUBE_KEY`, `OPENAI_API_KEY`, `DEBUG`, and optionally `DB_POOL_MIN`/`DB_POOL_MAX` (Knex pool size, defaults 2/5). See `.env.example` and the root `CLAUDE.md`'s "Local environment setup" for which ones `pnpm setup:env` fills in and which are optional locally.
