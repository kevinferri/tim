# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 (App Router) / React 19 chat/community app ("Tim") built on React Server Components:

- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM, with a custom model-extension layer
- **Styling**: TailwindCSS + shadcn/ui (Radix primitives)
- **Auth**: NextAuth.js (Google provider, JWT session strategy), plus a dev-only seeded login
- **Real-time**: Socket.io client — connects to the sibling `apps/realtime-server` service (separately deployed, lives in this monorepo)
- **State**: TanStack Query (server data), Zustand (client-only UI state), Server Components/Server Actions (server)
- **Media**: Cloudinary

Core data model (see `prisma/schema.prisma`): `User` → `Circle` (has members, a creator, and a `defaultTopic`) → `Topic` → `Message` → `Highlight`, with per-user `TopicReadState`/`TopicPreference` and `Notification`. Cascading deletes flow Circle → Topic → Message/Highlight. Games add their own tables (`circle_games`, `game_room_seen`, `same_page_*`, `wordsmith_plays`).

## Commands

```bash
pnpm dev                  # Dev server (localhost:3000); `predev` starts the embedded Postgres (scripts/db.js)
pnpm test                 # vitest (see "Tests" below)
pnpm lint                 # eslint (flat config in eslint.config.mjs)
npx tsc --noEmit          # Typecheck; safe while dev is running
pnpm build                # next build — don't run while `pnpm dev` is running (corrupts .next, see root CLAUDE.md)
pnpm start                # Applies pending migrations (prisma migrate deploy), then starts the production server

pnpm db:up                 # Start the embedded local Postgres on its own
pnpm db:seed               # Seed users, circles (incl. "Sandbox"), topics, and messages for local dev
pnpm db:generate           # Regenerate Prisma client after schema changes
pnpm db:migrate            # Edit schema.prisma, then run this to create + apply a migration (add `--name <name>` to skip the prompt)
pnpm db:push               # Push schema.prisma changes to the DB without a migration (dev-only prototyping)
pnpm db:genpush            # generate + push combined — quick local iteration only, see below
pnpm db:deploy             # Apply pending migrations without prompting (what `pnpm start` runs internally)
pnpm db:studio             # Open Prisma Studio
pnpm db:reset              # Drop and recreate the dev DB from migrations
```

All `db:*` scripts run through `dotenv -e .env.local`, so DB env vars only need to live there. Prisma client changes (new models, new model-extension methods) need a `pnpm dev` restart, because the client is cached on `global` in dev.

### Prisma migrations

`prisma/migrations/` is the source of truth for schema history, committed to git. **Schema changes go through `pnpm db:migrate`**, which writes a new timestamped folder under `prisma/migrations/` — commit that folder along with the `schema.prisma` edit that produced it. `pnpm db:push`/`db:genpush` skip migration history entirely and should stay a dev-only prototyping tool (quickly trying out a shape locally); a change made that way needs a real migration via `db:migrate` before it's real, or it will drift local/prod out of sync with `schema.prisma` again.

In production, `pnpm start` (the Docker `CMD`) runs `prisma migrate deploy` before `next start` on every boot, applying any migrations that shipped in that deploy. This has to happen at container **start**, not image build — DO App Platform doesn't inject `DATABASE_URL` (or any runtime env var) into the Docker build stage, only at container runtime (see `ce668ea`).

The migration history was baselined from an existing production DB that had no prior migration tracking (schema was managed by hand via `db push`/manual SQL) — see `20260911162439_baseline`. If prod schema ever needs to be baselined again (e.g. after another period of manual changes), the pattern is: generate the migration SQL from `schema.prisma` with `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, verify it matches prod's actual live schema with `prisma migrate diff --from-url "$PROD_DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` (empty output = no drift), then mark it applied on prod without running it via `prisma migrate resolve --applied <migration_name>`.

## Tests

Vitest (`vitest.config.mts`). Tests sit next to the code as `*.test.ts`. Database-backed tests (model extensions, actions, routes) run against a separate embedded Postgres test instance set up by `vitest.global-setup.ts` (`scripts/test-db.js`), which `apps/realtime-server`'s suite shares; test files run serially because they share tables.

## Environment variables

`FRONTEND_URL`, `JWT_SECRET`, `DATABASE_URL`, `CRYPTO_KEY`, `GOOGLE_CALLBACK_URL`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`/`NEXTAUTH_SECRET`/`NEXTAUTH_COOKIE_KEY`, `WS_SERVER_URL`/`WS_SERVER_PATH`, `CLOUDINARY_URL`, `WORDSMITH_SEED` (secret order of Wordsmith's public answer list; required in production, never change it once set). See `.env.example` and the root `CLAUDE.md`'s "Local environment setup" section for which of these `pnpm setup:env` fills in automatically and which are optional locally.

## Architecture

### Prisma client with model extensions

`src/lib/prisma/client.ts` builds the singleton `prismaClient` via `$extends`, attaching custom methods per model from `src/lib/prisma/*-model.ts` (e.g. `prismaClient.circle.getByIdForUser(...)`, `prismaClient.circle.isUserInCircle(...)`). These model files are where cross-cutting query logic lives (auth-scoped lookups, membership checks) — prefer adding a method there over inlining raw `prismaClient.<model>.findMany` calls with ad-hoc auth logic in actions/routes. The client is cached on `global` outside production to survive HMR.

### Auth and session

`src/lib/session.ts` defines NextAuth `authOptions` (Google provider, JWT sessions). On sign-in it upserts a `User` row by email and uploads the Google avatar to Cloudinary. `getLoggedInUserId()` is the standard way to get the current user id in server code (actions, route handlers, model methods) — it wraps `getServerSession`.

For local dev without Google OAuth, `src/app/api/dev/login/route.ts` mints a session for a **seeded** user (`/api/dev/login?email=…`; 404 in production, rejects non-seeded emails). After `pnpm db:seed`, the sign-in page shows a **Sign into test sandbox** button that uses it.

`src/proxy.ts` (Next's renamed `middleware.ts` convention as of v16) gates all routes except `/api/auth`, static assets, and `/signin`: it checks for the NextAuth session cookie (`NEXTAUTH_COOKIE_KEY`) and redirects unauthenticated page requests to sign-in / rejects `/api/*` requests with 401. It also stamps `x-current-path` on the request headers, which `src/app/layout.tsx` reads back out to detect a stale-cookie state and redirect to `/force-signout`.

### Root layout branches on auth state

`src/app/layout.tsx` (`RootLayout`) is a server component that loads the current user and renders either `LoggedOutLayout` or `LoggedInLayout`. `LoggedInLayout` is where global providers are wired up in this order: `SelfProvider` (current user context) → `SocketProvider` → `UserRoomConnect` / `CircleRoomConnect` (joins the user's socket rooms) → nav/chrome. It also mints the socket JWT (signed with `JWT_SECRET`, containing the full user object) passed to `SocketProvider`.

### Real-time via the sibling socket server

The Socket.io server is a separately-deployed service (`apps/realtime-server` in this monorepo, not this Next.js process) — the client in `src/components/socket/socket-provider.tsx` connects to `WS_SERVER_URL`/`WS_SERVER_PATH` using a per-session JWT. `src/components/socket/use-socket.ts` re-exports the `SocketEvent` enum from `@tim/socket-types` (the canonical source, shared with `apps/realtime-server`) and defines the `useSocketHandler` / `useSocketEmit` hooks used throughout `src/components` to subscribe to and emit events. When adding a new real-time event, add it to `packages/socket-types/src/index.ts` first — that's the contract both apps import from.

### Server actions vs. API routes

Mutations triggered from forms/UI generally go through `"use server"` actions in `src/actions/` (one file per area, e.g. `circles.ts`, `topics.ts`, `notifications.ts`), validated with `zod` schemas defined inline above each action. Data fetched by REST-style consumers (e.g. paginated message history, link previews) lives under `src/app/api/**/route.ts`. Both layers rely on `getLoggedInUserId()` plus a Prisma model-extension membership check (e.g. `isUserInCircle`) before allowing a mutation/read — follow that same auth-then-authorize pattern for new actions/routes rather than trusting client-supplied ids. Route handlers are wrapped in `apiRoute()` from `src/lib/api.ts`: call `requireUserId()` and throw `ApiError(status)` for expected failures (400/401/403/404); anything else thrown is logged and returned as a generic 500, so internals never leak and each request gets a fresh `Response`.

### Client-side data fetching

TanStack React Query (`src/components/providers/query-provider.tsx`, mounted in `src/app/layout.tsx`) is the single client-side fetching system — there is no hand-rolled fetch hook. Plain HTTP GETs use `useQuery`/`useInfiniteQuery`; data that's also mutated by socket events (topic messages, top highlights, media messages — see `src/components/topics/provider/`) is seeded from SSR props via `initialData` and then read/written entirely through the query cache, so a socket handler anywhere can patch it with `queryClient.setQueryData(key, ...)` instead of threading update callbacks through providers. Shared cache-key builders and cross-cache update helpers for topic data live in `src/components/topics/provider/topic-query-cache.ts` — prefer those over hand-writing `setQueryData` calls against `["messages", topicId]` elsewhere, since that cache holds paginated (`useInfiniteQuery`) data, not a plain array. Zustand stays for pure client UI/ephemeral state that never fetches over HTTP (unread topics, presence, room membership, sound toggle, etc.).

### Games

Each game is self-contained under `src/games/<game>/` (`lib/`, `server/`, `components/`) and exports a `GameDefinition` (name, icon, panel, badge), or a `ComingSoonGame` for one that's listed but not playable yet. Every folder under `src/games/` counts as a game for the import rules below, including shared non-game folders. `src/games/game-room/` is the shared shell: the sidebar button, the sheet, its store, and (in `game-room/server`) which games are on in which circle. Every game is off per circle until the circle's creator turns it on, stored as rows in one `circle_games` table keyed by each game's id, so a new game needs no table for this. Each game's own badge stays until you've finished it that day; the sidebar Game room button only lights up for badges you haven't seen in the room yet today (`game_room_seen`, per user and circle, reset at midnight Eastern). It never imports a game. Games are registered with it in `src/games/index.tsx`, the only file that knows every game, which the app mounts. The rest of the app imports a game only through its entry points, `@/games/<game>` (client-safe) and `@/games/<game>/server`, and a game imports its own files with relative paths. One generic ESLint `no-restricted-imports` rule in `eslint.config.mjs` enforces this for every game (no per-game config), plus one that keeps the Game room from importing any game. A game's tables (e.g. `same_page_*`) are still defined in `schema.prisma`, and its API route file under `src/app/api/` just re-exports from the game.

Same Page's scheduled work (6am prompt, 2pm nudge, 4pm reveal, weekdays, Eastern time; defined once in `src/games/same-page/lib/schedule.ts`) runs from a cron started in `src/instrumentation.ts`, which also runs once on startup to catch up on anything missed. Alerts are saved as circle-level notifications (`Notification.circleId`, no message or actor) with no socket push. Open tabs pick them up from a refresh timer at each alert time and when the tab becomes visible again. The realtime server has no Same Page code apart from the `/samepage sock` command.

### News

Circles follow news sources (RSS/Atom feeds, or Google News topic searches) and see new stories live. A feed URL is stored once in `news_feeds` and shared by every circle that follows it (`circle_news_sources`); `apps/realtime-server` polls feeds and pushes new `news_items` over Socket.IO. Here, `src/lib/news.ts` holds the server side (adding a source resolves and seeds it via `@tim/news`, listing items, removal by the adder or circle creator, and `getNewsLinkPreview`, which `/api/link-metadata` uses so shared stories preview from stored data), with routes under `src/app/api/circles/[circleId]/news/`. The UI is `src/components/news/`: the sidebar button beside the Game room, and a panel mounted once in the circle layout (feed, sources screen, share form). Live items are held as "N new stories" while the panel is open; the unread dot compares the newest item's `createdAt` with what the viewer last saw (localStorage).

### Path aliases & conventions

- `@/*` → `src/*`
- Client components need `"use client"`; everything else defaults to Server Component
- File names: kebab-case; components: PascalCase named exports (default exports only where Next requires them, e.g. `page.tsx`, `layout.tsx`)
- Merge Tailwind classes with `cn()` from `@/lib/utils`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
