# Tim

A chat/community app, built as a Yarn workspaces monorepo:

- `apps/chat` — Next.js 14 app (UI, auth, database)
- `apps/realtime-server` — Socket.IO server (real-time messaging, presence)
- `packages/socket-types` — shared socket event contract between the two
- `packages/db-types` — DB model types (from `apps/chat`'s Prisma schema) shared with `apps/realtime-server`

## Getting started

```bash
yarn install
yarn dev
```

This runs both services at once: `chat` on [localhost:3000](http://localhost:3000), `realtime-server` on `localhost:2428`.

Each app needs its own `.env.local` (`apps/chat/.env.local`, `apps/realtime-server/.env.local`) — these are gitignored and not included in the repo.

See `CLAUDE.md` at the root and in each app for architecture details and conventions.
