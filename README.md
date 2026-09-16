# Tim

A chat/community app, built as a pnpm workspaces monorepo.

## Getting started

```bash
pnpm install
pnpm setup:env
pnpm dev
```

This runs both services at once: `chat` on [localhost:3000](http://localhost:3000), `realtime-server` on [localhost:2428](http://localhost:2428).

`pnpm setup:env` generates local secrets and fills in known-safe local defaults (DB connection, ports, URLs) into each app's `.env.local`. It won't fill in real third-party credentials (Google OAuth, Cloudinary, Giphy, YouTube, OpenAI) — see `apps/*/.env.example` for what each does and where to get one; most are optional for local dev and fall back to a canned response when missing.

See `CLAUDE.md` at the root and in each app for architecture details and conventions.
