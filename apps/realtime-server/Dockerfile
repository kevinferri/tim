# Build context is the monorepo root (see .do/ app spec: no source_dir set for
# this component, since the build needs the root yarn.lock and packages/shared-types,
# not just apps/realtime-server in isolation).

FROM node:20-bookworm-slim

WORKDIR /app
COPY . .

RUN yarn install --frozen-lockfile
RUN yarn workspace @tim/shared-types build

WORKDIR /app/apps/realtime-server
RUN npx tsc

ENV NODE_ENV=production
EXPOSE 8080
CMD ["yarn", "start"]
