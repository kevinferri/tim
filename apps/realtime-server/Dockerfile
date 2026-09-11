# Build context is the monorepo root (see .do/ app spec: no source_dir set for
# this component, since the build needs the root pnpm-lock.yaml, packages/socket-types,
# and packages/db-types, not just apps/realtime-server in isolation).

FROM node:22-bookworm-slim

# Pinned to match the root package.json "packageManager" field. Installed via
# npm instead of `corepack enable` — corepack's signature verification has had
# stale-keyid failures against recently-published pnpm releases.
RUN npm install -g pnpm@12.4.1

WORKDIR /app
COPY . .

# DO App Platform's build container has a fixed 8GB combined RAM+disk budget,
# and Kaniko's post-install filesystem snapshot scales with total file count.
# apps/chat can't be pruned out of this install (via `pnpm install --filter`)
# the way it is in apps/chat/Dockerfile: @tim/db-types depends on
# @prisma/client, and its real generated types only exist once apps/chat's own
# "postinstall": "prisma generate" script has run against
# apps/chat/prisma/schema.prisma — pnpm dedupes @prisma/client to one shared
# store entry, so that one generate call is what every consumer (chat and
# db-types alike) actually resolves against. embedded-postgres (a ~150MB
# devDependency apps/chat only uses for local dev's `predev`/`db:up`) is
# unrelated to that and safe to drop before install runs (pruning it after
# wouldn't help — the OOM risk is in the snapshot of this layer):
RUN cd apps/chat && npm pkg delete devDependencies.embedded-postgres

# --frozen-lockfile is intentionally NOT used here: deleting embedded-postgres
# above makes package.json diverge from the committed lockfile on purpose,
# which a frozen install refuses. A non-frozen install can only shrink the
# lockfile to match (drop that one already-resolved entry) — every other
# package's resolved version is untouched, since every other specifier still
# matches what's committed exactly.
RUN pnpm install
RUN pnpm --filter @tim/socket-types build
RUN pnpm --filter @tim/db-types build
RUN pnpm --filter @tim/commands build
RUN pnpm --filter @tim/user-display build
RUN pnpm --filter @tim/crypto build

WORKDIR /app/apps/realtime-server
RUN npx tsc

ENV NODE_ENV=production
EXPOSE 8080
CMD ["pnpm", "start"]
