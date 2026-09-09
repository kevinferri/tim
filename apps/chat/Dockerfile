# Build context is the monorepo root (see .do/ app spec: no source_dir set for
# this component, since the build needs the root yarn.lock and packages/shared-types,
# not just apps/chat in isolation).

FROM node:20-bookworm-slim

WORKDIR /app
COPY . .

RUN yarn install --frozen-lockfile
RUN yarn workspace @tim/shared-types build

WORKDIR /app/apps/chat
RUN yarn build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
