# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`tim` is a Yarn workspaces monorepo for the "Tim" chat/community app, holding two independently-deployed services plus one shared package:

- **`apps/chat`** — the Next.js 14 (App Router) app: UI, auth, Prisma/Postgres (owns the DB schema), server actions. See `apps/chat/CLAUDE.md` for its architecture in detail.
- **`apps/realtime-server`** — a standalone Node/TypeScript Socket.IO server: messaging, rooms, presence, highlights, notifications. Uses Knex against the same Postgres database as `apps/chat`, but owns no schema/migrations of its own — `apps/chat`'s Prisma schema is the single source of truth. See `apps/realtime-server/CLAUDE.md`.
- **`packages/shared-types`** — the canonical `SocketEvent` enum (`packages/shared-types/src/socket-events.ts`), consumed by both apps. This is the wire contract between them: **add new socket events here first**, not in either app. Both apps' own "hub" files (`apps/chat/src/components/socket/use-socket.ts`, `apps/realtime-server/src/event-handlers/main.ts`) just re-export it.

This repo was formed by merging two previously-separate repos (`react-server-components`, `discord-clone-socket-server`) via `git-filter-repo`, preserving full commit history under the new `apps/*` paths — `git log`/`git blame` on files in either app walk back through their original pre-merge history.

## Commands

```bash
yarn dev                              # Run both apps concurrently (chat on :3000, realtime-server on :2428)
yarn workspace react-server-components <script>   # Run a script in apps/chat (see its package.json name)
yarn workspace tim-chat-server <script>           # Run a script in apps/realtime-server (see its package.json name)
yarn workspace @tim/shared-types build            # Rebuild the shared package after changing socket-events.ts
```

Each app keeps its own `package.json` name (`react-server-components`, `tim-chat-server`) and scripts unchanged from before the merge — `yarn workspace <name> ...` is how you target one of them from the root. Per-app commands (Prisma db scripts, etc.) are documented in each app's own `CLAUDE.md`.

## Structure & conventions

- Single root `yarn.lock`; each app also keeps its own `tsconfig.json` unchanged (`apps/chat` is strict/ESM/DOM-lib since Next handles its own TS compilation and emits nothing; `apps/realtime-server` is non-strict/CommonJS and emits a real `dist/` build) — these are deliberate, real differences and not something to unify.
- `packages/shared-types` builds via `tsc` to `dist/` + `.d.ts`; both apps resolve it through the Yarn workspace symlink, so rebuild it (`yarn workspace @tim/shared-types build`) after editing its source before relying on the change from either app.
- Deployment target: both apps are meant to run as components of a single DigitalOcean App Platform App (not two separate DO Apps), so one push produces one coordinated deployment across both services instead of independently-timed ones. As of this writing the DO cutover to that single-App setup is still pending — the two original DO Apps (one per old repo) are still what's live.
- `.env.local` files are per-app (`apps/chat/.env.local`, `apps/realtime-server/.env.local`), gitignored, and not shared at the root.
