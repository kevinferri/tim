# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 14 (App Router) chat/community app ("Tim") built on React Server Components:
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM, with a custom model-extension layer
- **Styling**: TailwindCSS + shadcn/ui (Radix primitives)
- **Auth**: NextAuth.js (Google provider only, JWT session strategy)
- **Real-time**: Socket.io client — connects to the sibling `apps/realtime-server` service (separately deployed, lives in this monorepo)
- **State**: Zustand (client), Server Components/Server Actions (server)
- **Media**: Cloudinary

Data model (see `prisma/schema.prisma`): `User` → `Circle` (has members, a creator, and a `defaultTopic`) → `Topic` → `Message` → `Highlight`, plus `TopicHistory` for per-user read state. Cascading deletes flow Circle → Topic → Message/Highlight.

## Commands

```bash
pnpm dev                  # Start dev server (localhost:3000)
pnpm build                # Production build
pnpm start                # Applies pending migrations (prisma migrate deploy), then starts the production server
pnpm lint                 # next lint

pnpm db:generate           # Regenerate Prisma client after schema changes
pnpm db:push               # Push schema.prisma changes to the DB without a migration (dev-only prototyping)
pnpm db:genpush            # generate + push combined — quick local iteration only, see below
pnpm db:migrate            # Edit schema.prisma, then run this to create + apply a migration file (interactive, prompts for a name)
pnpm db:deploy              # Apply pending migrations without prompting (what `pnpm start` runs internally)
pnpm db:studio             # Open Prisma Studio
pnpm db:reset              # Drop and recreate the dev DB from migrations
```

All `db:*` scripts run through `dotenv -e .env.local`, so DB env vars only need to live there.

### Prisma migrations

`prisma/migrations/` is the source of truth for schema history, committed to git. **Schema changes go through `pnpm db:migrate`**, which writes a new timestamped folder under `prisma/migrations/` — commit that folder along with the `schema.prisma` edit that produced it. `pnpm db:push`/`db:genpush` skip migration history entirely and should stay a dev-only prototyping tool (quickly trying out a shape locally); a change made that way needs a real migration via `db:migrate` before it's real, or it will drift local/prod out of sync with `schema.prisma` again.

In production, `pnpm start` (the Docker `CMD`) runs `prisma migrate deploy` before `next start` on every boot, applying any migrations that shipped in that deploy. This has to happen at container **start**, not image build — DO App Platform doesn't inject `DATABASE_URL` (or any runtime env var) into the Docker build stage, only at container runtime (see `ce668ea`).

The migration history was baselined from an existing production DB that had no prior migration tracking (schema was managed by hand via `db push`/manual SQL) — see `20260911162439_baseline`. If prod schema ever needs to be baselined again (e.g. after another period of manual changes), the pattern is: generate the migration SQL from `schema.prisma` with `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, verify it matches prod's actual live schema with `prisma migrate diff --from-url "$PROD_DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` (empty output = no drift), then mark it applied on prod without running it via `prisma migrate resolve --applied <migration_name>`.

No test framework is configured in this repo.

## Architecture

### Prisma client with model extensions

`src/lib/prisma/client.ts` builds the singleton `prismaClient` via `$extends`, attaching custom methods per model from `src/lib/prisma/{user,circle,topic,message}-model.ts` (e.g. `prismaClient.user.getLoggedIn(...)`, `prismaClient.circle.isUserInCirle(...)`). These model files are where cross-cutting query logic lives (auth-scoped lookups, membership checks) — prefer adding a method there over inlining raw `prismaClient.<model>.findMany` calls with ad-hoc auth logic in actions/routes. The client is cached on `global` outside production to survive HMR.

### Auth and session

`src/lib/session.ts` defines NextAuth `authOptions` (Google provider, JWT sessions). On sign-in it upserts a `User` row by email and uploads the Google avatar to Cloudinary. `getLoggedInUserId()` is the standard way to get the current user id in server code (actions, route handlers, model methods) — it wraps `getServerSession`.

`proxy.ts` (Next's renamed `middleware.ts` convention as of v16) gates all routes except `/api/auth`, static assets, and `/signin`: it checks for the NextAuth session cookie (`NEXTAUTH_COOKIE_KEY`) and redirects unauthenticated page requests to sign-in / rejects `/api/*` requests with 401. It also stamps `x-current-path` on the request headers, which `src/app/layout.tsx` reads back out to detect a stale-cookie state and redirect to `/force-signout`.

### Root layout branches on auth state

`src/app/layout.tsx` (`RootLayout`) is a server component that loads the current user and renders either `LoggedOutLayout` or `LoggedInLayout`. `LoggedInLayout` is where global providers are wired up in this order: `SelfProvider` (current user context) → `SocketProvider` → `UserRoomConnect` / `CircleRoomConnect` (joins the user's socket rooms) → nav/chrome. It also mints the socket JWT (signed with `JWT_SECRET`, containing the full user object) passed to `SocketProvider`.

### Real-time via the sibling socket server

The Socket.io server is a separately-deployed service (`apps/realtime-server` in this monorepo, not this Next.js process) — the client in `src/components/socket/socket-provider.tsx` connects to `WS_SERVER_URL`/`WS_SERVER_PATH` using a per-session JWT. `src/components/socket/use-socket.ts` re-exports the `SocketEvent` enum from `@tim/socket-types` (the canonical source, shared with `apps/realtime-server`) and defines the `useSocketHandler` / `useSocketEmit` hooks used throughout `src/components` to subscribe to and emit events. When adding a new real-time event, add it to `packages/socket-types/src/index.ts` first — that's the contract both apps import from.

### Server actions vs. API routes

Mutations triggered from forms/UI generally go through `"use server"` actions in `src/actions/` (`circles.ts`, `topics.ts`, `media.ts`, `user-status.ts`), validated with `zod` schemas defined inline above each action. Data fetched by REST-style consumers (e.g. paginated message history, link previews) lives under `src/app/api/**/route.ts`. Both layers rely on `getLoggedInUserId()` plus a Prisma model-extension membership check (e.g. `isUserInCirle`) before allowing a mutation/read — follow that same auth-then-authorize pattern for new actions/routes rather than trusting client-supplied ids.

### Client-side data fetching

TanStack React Query (`src/components/providers/query-provider.tsx`, mounted in `src/app/layout.tsx`) is the single client-side fetching system — there is no hand-rolled fetch hook. Plain HTTP GETs use `useQuery`/`useInfiniteQuery`; data that's also mutated by socket events (topic messages, top highlights, media messages — see `src/components/topics/provider/`) is seeded from SSR props via `initialData` and then read/written entirely through the query cache, so a socket handler anywhere can patch it with `queryClient.setQueryData(key, ...)` instead of threading update callbacks through providers. Shared cache-key builders and cross-cache update helpers for topic data live in `src/components/topics/provider/topic-query-cache.ts` — prefer those over hand-writing `setQueryData` calls against `["messages", topicId]` elsewhere, since that cache holds paginated (`useInfiniteQuery`) data, not a plain array. Zustand stays for pure client UI/ephemeral state that never fetches over HTTP (unread topics, presence, room membership, sound toggle, etc.).

### Path aliases & conventions

- `@/*` → `src/*`
- Client components need `"use client"`; everything else defaults to Server Component
- File names: kebab-case; components: PascalCase matching their default export
- Merge Tailwind classes with `cn()` from `@/lib/utils`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
