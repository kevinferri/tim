# Build context is the monorepo root (see .do/ app spec: no source_dir set for
# this component, since the build needs the root yarn.lock and packages/socket-types,
# not just apps/chat in isolation).

FROM node:22-bookworm-slim

# node:22-bookworm-slim doesn't ship openssl, so Prisma's "native" binary-target
# auto-detection (which runs during `yarn install`'s postinstall -> prisma generate)
# can't probe the real OpenSSL version and silently falls back to a wrong guess
# (debian-openssl-1.1.x instead of Bookworm's actual 3.0.x), which fails at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# DO App Platform's build container has a fixed 8GB combined RAM+disk budget,
# and Kaniko's post-install filesystem snapshot scales with total file count.
# Trim what this build's `yarn install` pulls in before it runs (not after —
# the OOM risk is in the snapshot of this layer, so pruning post-install
# doesn't help):
#  - apps/realtime-server isn't a dependency of chat at all; under Yarn v1
#    hoisting a single root install otherwise pulls in its whole toolchain
#    (knex, pg, vitest, vite, ts-node, nodemon) for nothing.
#  - embedded-postgres is a ~150MB devDependency used only by
#    scripts/db.js for local dev (`predev`/`db:up`) — next build never
#    touches it.
RUN rm -rf apps/realtime-server && \
    cd apps/chat && npm pkg delete devDependencies.embedded-postgres

RUN yarn install --frozen-lockfile
RUN yarn workspace @tim/socket-types build
RUN yarn workspace @tim/commands build
RUN yarn workspace @tim/user-display build

WORKDIR /app/apps/chat
RUN yarn build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
