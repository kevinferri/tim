# Build context is the monorepo root (see .do/ app spec: no source_dir set for
# this component, since the build needs the root yarn.lock, packages/socket-types,
# and packages/db-types, not just apps/realtime-server in isolation).

FROM node:22-bookworm-slim

WORKDIR /app
COPY . .

# DO App Platform's build container has a fixed 8GB combined RAM+disk budget,
# and Kaniko's post-install filesystem snapshot scales with total file count.
# apps/chat can't be pruned here the way it is in apps/chat/Dockerfile: this
# build's @tim/db-types depends on @prisma/client, and generating it runs
# against apps/chat/prisma/schema.prisma as a side effect of installing
# apps/chat's own @prisma/client dependency. But embedded-postgres (a
# ~150MB devDependency apps/chat only uses for local dev's `predev`/`db:up`)
# is unrelated to that and safe to drop before install runs (pruning it
# after wouldn't help — the OOM risk is in the snapshot of this layer):
RUN cd apps/chat && npm pkg delete devDependencies.embedded-postgres

RUN yarn install --frozen-lockfile
RUN yarn workspace @tim/socket-types build
RUN yarn workspace @tim/db-types build
RUN yarn workspace @tim/commands build
RUN yarn workspace @tim/user-display build
RUN yarn workspace @tim/crypto build

WORKDIR /app/apps/realtime-server
RUN npx tsc

ENV NODE_ENV=production
EXPOSE 8080
CMD ["yarn", "start"]
