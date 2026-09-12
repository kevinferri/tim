# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`tim` is a pnpm workspaces monorepo for the "Tim" chat/community app, holding two independently-deployed services plus one shared package:

- **`apps/chat`** — the Next.js 14 (App Router) app: UI, auth, Prisma/Postgres (owns the DB schema), server actions. See `apps/chat/CLAUDE.md` for its architecture in detail.
- **`apps/realtime-server`** — a standalone Node/TypeScript Socket.IO server: messaging, rooms, presence, highlights, notifications. Uses Knex against the same Postgres database as `apps/chat`, but owns no schema/migrations of its own — `apps/chat`'s Prisma schema is the single source of truth. See `apps/realtime-server/CLAUDE.md`.
- **`packages/socket-types`** — the canonical `SocketEvent` enum (`packages/socket-types/src/index.ts`), consumed by both apps. This is the wire contract between them: **add new socket events here first**, not in either app. Both apps' own "hub" files (`apps/chat/src/components/socket/use-socket.ts`, `apps/realtime-server/src/event-handlers/main.ts`) just re-export it.
- **`packages/db-types`** — re-exports Prisma's generated model types (`User`, `Circle`, `Topic`, `Message`, `Highlight`, `TopicHistory`) from `apps/chat`'s schema. One-directional (`apps/chat`'s `schema.prisma` is still the single source of truth — nothing is added here first): `apps/realtime-server` imports these types to type its Knex queries against the real schema instead of hand-rolling row/arg shapes. Types only — no runtime DB client or query code is shared, since the two apps' data-access needs (a full ORM with transactions/relations vs. a lean low-latency query builder) are different enough that unifying the engine isn't worth it. See `apps/realtime-server/CLAUDE.md`.

## Commands

```bash
pnpm dev                              # Run both apps concurrently (chat on :3000, realtime-server on :2428)
pnpm --filter chat <script>                       # Run a script in apps/chat (see its package.json name)
pnpm --filter tim-chat-server <script>            # Run a script in apps/realtime-server (see its package.json name)
pnpm --filter @tim/socket-types build              # Rebuild after changing packages/socket-types/src/index.ts
pnpm --filter @tim/db-types build                 # Rebuild after changing apps/chat/prisma/schema.prisma
```

Each app keeps its own `package.json` name (`chat`, `tim-chat-server`) — `pnpm --filter <name> ...` is how you target one of them from the root. Per-app commands (Prisma db scripts, etc.) are documented in each app's own `CLAUDE.md`.

**Don't run either app's `build` script while `pnpm dev` is running.** `pnpm --filter chat build` runs `next build`, which writes into the same `apps/chat/.next` directory the dev server is using live — this corrupts its webpack cache (e.g. `Resolving './vendor-chunks/...' doesn't lead to expected result` errors) and forces a manual `.next` wipe + restart. (Under the old Yarn v1 setup, `apps/realtime-server`'s `build` script also used to `rm -rf node_modules && yarn install`, which — because Yarn v1 hoists all workspaces into one shared root `node_modules` — could bleed into and corrupt `chat`'s install/dev cache too. pnpm's per-package symlinked `node_modules` doesn't hoist that way, and the script no longer does a destructive reinstall, so that specific cross-app failure mode is gone; the `next build`-vs-`next dev` cache conflict above is unrelated to the package manager and still applies.) To typecheck either app without any of that, run `npx tsc --noEmit` from the app's directory (uses its own `tsconfig.json`, touches neither `.next` nor `node_modules`) — safe to run anytime, including alongside a live `pnpm dev`.

## Structure & conventions

- Single root `pnpm-lock.yaml` and `pnpm-workspace.yaml`; each app also keeps its own `tsconfig.json` unchanged (`apps/chat` is strict/ESM/DOM-lib since Next handles its own TS compilation and emits nothing; `apps/realtime-server` is non-strict/CommonJS and emits a real `dist/` build) — these are deliberate, real differences and not something to unify.
- `packages/socket-types` and `packages/db-types` both build via `tsc` to `dist/` + `.d.ts`; both apps resolve them through the pnpm workspace symlink (`"workspace:*"` in each app's `package.json`), so rebuild the relevant one (`pnpm --filter @tim/socket-types build` / `pnpm --filter @tim/db-types build`) after editing its source before relying on the change from either app.
- Deployment: both apps run as components (`tim-fe`, `tim-ws`) of a single DigitalOcean App Platform App, sharing one domain — one push produces one coordinated deployment across both services. Each component builds from its own `Dockerfile` (`apps/chat/Dockerfile`, `apps/realtime-server/Dockerfile`) rather than DO's buildpack auto-detection, since buildpacks can't see a monorepo's root `pnpm-lock.yaml` from inside a component's subdirectory. Both Dockerfiles install pnpm globally via `npm install -g pnpm@<version>` pinned to the root `package.json`'s `"packageManager"` field, rather than `corepack enable` — corepack's signature verification has had stale-keyid failures against recently-published pnpm releases.
- `.env.local` files are per-app (`apps/chat/.env.local`, `apps/realtime-server/.env.local`), gitignored, and not shared at the root.

## Code comments

Default to no comments. When one is genuinely needed (a non-obvious WHY — a hidden constraint, a workaround, a subtle invariant), keep it concise and to the point. Avoid multi-paragraph comment blocks walking through reasoning step by step; if it needs that much explanation, simplify the code instead.
