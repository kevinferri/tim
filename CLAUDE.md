# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`tim` is a Yarn workspaces monorepo for the "Tim" chat/community app, holding two independently-deployed services plus one shared package:

- **`apps/chat`** — the Next.js 14 (App Router) app: UI, auth, Prisma/Postgres (owns the DB schema), server actions. See `apps/chat/CLAUDE.md` for its architecture in detail.
- **`apps/realtime-server`** — a standalone Node/TypeScript Socket.IO server: messaging, rooms, presence, highlights, notifications. Uses Knex against the same Postgres database as `apps/chat`, but owns no schema/migrations of its own — `apps/chat`'s Prisma schema is the single source of truth. See `apps/realtime-server/CLAUDE.md`.
- **`packages/shared-types`** — the canonical `SocketEvent` enum (`packages/shared-types/src/socket-events.ts`), consumed by both apps. This is the wire contract between them: **add new socket events here first**, not in either app. Both apps' own "hub" files (`apps/chat/src/components/socket/use-socket.ts`, `apps/realtime-server/src/event-handlers/main.ts`) just re-export it.

## Commands

```bash
yarn dev                              # Run both apps concurrently (chat on :3000, realtime-server on :2428)
yarn workspace chat <script>                      # Run a script in apps/chat (see its package.json name)
yarn workspace tim-chat-server <script>           # Run a script in apps/realtime-server (see its package.json name)
yarn workspace @tim/shared-types build            # Rebuild the shared package after changing socket-events.ts
```

Each app keeps its own `package.json` name (`chat`, `tim-chat-server`) — `yarn workspace <name> ...` is how you target one of them from the root. Per-app commands (Prisma db scripts, etc.) are documented in each app's own `CLAUDE.md`.

**Don't run either app's `build` script while `yarn dev` is running.** `yarn workspace chat build` runs `next build`, which writes into the same `apps/chat/.next` directory the dev server is using live — this corrupts its webpack cache (e.g. `Resolving './vendor-chunks/...' doesn't lead to expected result` errors) and forces a manual `.next` wipe + restart. `yarn workspace tim-chat-server build` is worse: it starts with `rm -rf node_modules && yarn install`, and since this is a Yarn v1 workspaces repo, that reinstall touches the shared root `node_modules` (hoisting), not just `apps/realtime-server`'s — which can also invalidate `chat`'s dev cache and has broken root-level bins (e.g. `concurrently`) before. To typecheck either app without any of that, run `npx tsc --noEmit` from the app's directory (uses its own `tsconfig.json`, touches neither `.next` nor `node_modules`) — safe to run anytime, including alongside a live `yarn dev`.

## Structure & conventions

- Single root `yarn.lock`; each app also keeps its own `tsconfig.json` unchanged (`apps/chat` is strict/ESM/DOM-lib since Next handles its own TS compilation and emits nothing; `apps/realtime-server` is non-strict/CommonJS and emits a real `dist/` build) — these are deliberate, real differences and not something to unify.
- `packages/shared-types` builds via `tsc` to `dist/` + `.d.ts`; both apps resolve it through the Yarn workspace symlink, so rebuild it (`yarn workspace @tim/shared-types build`) after editing its source before relying on the change from either app.
- Deployment: both apps run as components (`tim-fe`, `tim-ws`) of a single DigitalOcean App Platform App, sharing one domain — one push produces one coordinated deployment across both services. Each component builds from its own `Dockerfile` (`apps/chat/Dockerfile`, `apps/realtime-server/Dockerfile`) rather than DO's buildpack auto-detection, since buildpacks can't see a monorepo's root `yarn.lock` from inside a component's subdirectory.
- `.env.local` files are per-app (`apps/chat/.env.local`, `apps/realtime-server/.env.local`), gitignored, and not shared at the root.
