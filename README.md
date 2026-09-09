# Tim

A chat/community app, built as a Yarn workspaces monorepo:

- `apps/chat` — Next.js 14 app (UI, auth, database)
- `apps/realtime-server` — Socket.IO server (real-time messaging, presence)
- `packages/shared-types` — shared socket event contract between the two

## Getting started

```bash
yarn install
yarn setup:env   # generates apps/chat/.env.local and apps/realtime-server/.env.local with throwaway local secrets
yarn dev
```

This runs both services at once: `chat` on [localhost:3000](http://localhost:3000), `realtime-server` on `localhost:2428`.

`yarn setup:env` won't touch existing `.env.local` files (pass `--force` to regenerate). It fills in everything needed to run against a local database with no shared secrets, but prints a list of a few values it can't generate — real credentials for Google OAuth (required to log in at all), Cloudinary, Giphy, YouTube, and OpenAI (each only needed for one specific feature). Get those from whoever owns the project, or supply your own.

See `CLAUDE.md` at the root and in each app for architecture details and conventions.
