# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`tim` is a pnpm workspaces monorepo for Tim, a chat/community app. Two independently deployed services share one Postgres database:

- **`apps/chat`** (package name `chat`) — the Next.js 16 / React 19 App Router app: UI, auth, server actions, API routes, games, and the Prisma schema, which is the single source of truth for the database. See `apps/chat/CLAUDE.md`.
- **`apps/realtime-server`** (package name `tim-chat-server`) — a standalone Node/TypeScript Socket.IO server: messaging, rooms, presence, highlights, notifications, slash commands. Reads and writes the same database with Knex but owns no schema or migrations. See `apps/realtime-server/CLAUDE.md`.

Shared packages live in `packages/`. Each is `@tim/<name>`, builds with `tsc` to `dist/`, and is consumed through `"workspace:*"`:

- **`@tim/socket-types`** — `SocketEvent`, `RoomType`, `NotificationType` — the wire contract between the two apps. **Add new socket events here first**, not in either app; each app's hub (`apps/chat/src/components/socket/use-socket.ts`, `apps/realtime-server/src/event-handlers/main.ts`) re-exports it.
- **`@tim/db-types`** — Re-exports Prisma's generated model types from `apps/chat`'s schema so the realtime server can type its Knex queries against the real tables. Types only and one-directional: add a model to `schema.prisma` first, then export it here if the realtime server needs it.
- **`@tim/commands`** — Slash command names, aliases, and parsing (`CommandName`, `COMMAND_ALIASES`, `parseCommand`), used by both apps.
- **`@tim/crypto`** — AES-256-GCM `encrypt`/`decrypt` for message text at rest (keyed by `CRYPTO_KEY`).
- **`@tim/user-display`** — Display-name rules (`getInitialDisplayName`, `DISPLAY_NAME_MAX_LENGTH`).
- **`@tim/casino`** — Cards, shared table shapes (`SEAT_COUNT`, `SeatOccupant`), and the blackjack rules as a pure state machine (`dealRound`, `applyAction`, `dealerDraw`, `settle`) plus the view types the realtime server broadcasts and the chat app renders. No sockets or DB.

Only types are shared for data access, not a DB client: the apps' needs (a full ORM with relations and transactions vs. a lean query builder) differ enough that one engine isn't worth it.

## Commands

```bash
pnpm install && pnpm setup:env         # Fresh checkout: install, then fill in both apps' .env.local
pnpm dev                               # Run both apps (chat on :3000, realtime-server on :2428)
pnpm --filter chat <script>            # Run a script in apps/chat
pnpm --filter tim-chat-server <script> # Run a script in apps/realtime-server
pnpm --filter "./packages/*" build     # Rebuild the shared packages; needed after editing any packages/*/src
pnpm --filter @tim/db-types build      # Also needed after changing apps/chat/prisma/schema.prisma
pnpm --filter @tim/casino test         # Blackjack engine tests (node:test against dist/)
pnpm format                            # Prettier over the whole repo (CI runs `pnpm format:check`)
pnpm test:scripts                      # node:test suite for scripts/ (setup-env parsing)
```

Per-app commands (Prisma, tests, lint) are in each app's `CLAUDE.md`. `./tim` at the root is just a shim for `pnpm "$@"`.

To typecheck an app, run `npx tsc --noEmit` from its directory. It touches neither `.next` nor `node_modules`, so it's safe anytime, including alongside `pnpm dev`.

CI (`.github/workflows/ci.yml`) runs on every PR: `pnpm format:check`, `pnpm test:scripts`, and for each app: build the shared packages, `tsc --noEmit`, lint, tests, then its `build` (chat also runs `prisma validate`). Run the same checks before opening a PR, except the build scripts (see below).

### Don't run the apps' `build` scripts during local development

- `pnpm --filter chat build` runs `next build`, which writes into the same `apps/chat/.next` directory a running `next dev` uses and corrupts its cache (e.g. `Resolving './vendor-chunks/...' doesn't lead to expected result`). Recovery: stop dev, delete `apps/chat/.next`, restart.
- `pnpm --filter tim-chat-server build` ends with `pnpm install --prod`, which strips devDependencies (TypeScript, vitest, eslint, …) **across the whole workspace**. Only CI runs it, as the last step of its job; the Dockerfile compiles with `npx tsc` instead. If you ran it by accident, `pnpm install` restores everything.

## Structure & conventions

- Code comments: concise and direct, one line where possible, and only when the WHY isn't obvious from the code (a hidden constraint, subtle invariant, workaround, or surprising behavior). Don't narrate what the code does or write multi-paragraph rationale in source; that belongs in the PR description.
- Formatting is Prettier (`.prettierrc.json`) across the repo; CI fails on unformatted files.
- One root `pnpm-lock.yaml` and `pnpm-workspace.yaml`. Node version is in `.nvmrc`; the pnpm version is pinned by the root `package.json`'s `"packageManager"`.
- The tsconfigs differ on purpose and shouldn't be unified: `apps/chat` is strict ESM with DOM libs (Next compiles it and emits nothing), `apps/realtime-server` is non-strict CommonJS and emits `dist/`, and each package has its own.
- `.env.local` files are per app (`apps/chat/.env.local`, `apps/realtime-server/.env.local`) and gitignored.

## Deployment

Both apps are components (`tim-fe`, `tim-ws`) of one DigitalOcean App Platform app on one domain, so a push to `main` produces one coordinated deployment of both. Each component builds from its own Dockerfile (`apps/chat/Dockerfile`, `apps/realtime-server/Dockerfile`) with the repo root as build context, since buildpacks can't see the root lockfile from an app subdirectory.

- **Adding a shared package:** add its `RUN pnpm --filter @tim/<name> build` line to each Dockerfile whose app depends on it.
- The Dockerfiles install pnpm with `npm install -g pnpm@<version>` (matching `"packageManager"`) instead of `corepack enable`, because corepack's signature checks fail against recently published pnpm releases.
- `apps/chat` applies pending Prisma migrations when its container starts (`pnpm start` runs `prisma migrate deploy`), not at image build time, because DO only provides `DATABASE_URL` at runtime.

## Local environment setup

Each app's committed `.env.example` lists every variable it reads, in three tiers:

1. **`# auto`-tagged** random secrets (`JWT_SECRET`, `CRYPTO_KEY`, `NEXTAUTH_SECRET`, `WORDSMITH_SEED`). `pnpm setup:env` (`scripts/setup-env.mjs`) generates missing ones into `.env.local` and never overwrites an existing value, so it's safe to rerun. `JWT_SECRET` and `CRYPTO_KEY` must match across both apps (JWT verification, message encryption); the script writes the same value into both.
2. **Known-safe local defaults**: ports, `localhost` URLs, and the connection string for the embedded Postgres that `apps/chat/scripts/db.js` runs. `pnpm setup:env` copies them as-is.
3. **Third-party credentials**, all optional locally:
   - **Google OAuth** isn't needed. Seed the database (`pnpm --filter chat db:seed`), then use **Sign into test sandbox** on `/signin`, or open `/api/dev/login?email=<seeded email>` to sign in as any seeded user (e.g. `tim.sandbox@example.com`, `socrates@example.com`; see `apps/chat/prisma/seed.ts`). The route is dev-only and only accepts seeded accounts. Two browser profiles signed in as two members of the seeded Sandbox circle give you two live users for testing real-time features.
   - **Cloudinary, Giphy, YouTube, OpenAI**: when a key is missing outside production and test, the call returns a real-shaped canned response instead of failing (`apps/chat/src/lib/cloudinary.ts` `uploadImage`; `apps/realtime-server/src/lib/media-fetchers.ts` and `open-ai.ts` `callOpenAI`). A fixed gif, video, reply, or image locally is this fallback, not a bug.
