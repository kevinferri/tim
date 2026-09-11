# Build context is the monorepo root (see .do/ app spec: no source_dir set for
# this component, since the build needs the root pnpm-lock.yaml and packages/socket-types,
# not just apps/chat in isolation).

FROM node:22-bookworm-slim

# node:22-bookworm-slim doesn't ship openssl, so Prisma's "native" binary-target
# auto-detection (which runs during `prisma generate`, our own explicit postinstall
# step below) can't probe the real OpenSSL version and silently falls back to a
# wrong guess (debian-openssl-1.1.x instead of Bookworm's actual 3.0.x), which
# fails at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Pinned to match the root package.json "packageManager" field. Installed via
# npm instead of `corepack enable` — corepack's signature verification has had
# stale-keyid failures against recently-published pnpm releases.
RUN npm install -g pnpm@12.4.1

WORKDIR /app
COPY . .

# DO App Platform's build container has a fixed 8GB combined RAM+disk budget,
# and Kaniko's post-install filesystem snapshot scales with total file count.
# `pnpm install --filter chat...` (chat + the workspace packages it actually
# depends on) already excludes apps/realtime-server's entire toolchain (knex,
# pg, vitest, vite, ts-node, nodemon) without needing to delete the directory
# the way a Yarn v1 hoisted install did. embedded-postgres is a separate
# ~150MB devDependency of chat itself (used only by scripts/db.js for local
# dev's `predev`/`db:up`; next build never touches it) — pnpm's --filter can't
# exclude a single dependency the way it excludes a whole workspace package,
# so it's dropped from package.json before install runs (not after — the OOM
# risk is in the snapshot of this layer, so pruning post-install doesn't help).
#
# --frozen-lockfile is intentionally NOT used here: deleting embedded-postgres
# makes package.json diverge from the committed lockfile on purpose, which a
# frozen install refuses. A non-frozen install can only shrink the lockfile to
# match (drop that one already-resolved entry) — every other package's
# resolved version is untouched, since every other specifier still matches
# what's committed exactly.
RUN cd apps/chat && npm pkg delete devDependencies.embedded-postgres
RUN pnpm install --filter chat...
RUN pnpm --filter @tim/socket-types build
RUN pnpm --filter @tim/commands build
RUN pnpm --filter @tim/user-display build
RUN pnpm --filter @tim/crypto build

WORKDIR /app/apps/chat
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
