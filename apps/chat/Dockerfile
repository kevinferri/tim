# Build context is the monorepo root (see .do/ app spec: no source_dir set for
# this component, since the build needs the root yarn.lock and packages/shared-types,
# not just apps/chat in isolation).

FROM node:20-bookworm-slim

# node:20-bookworm-slim doesn't ship openssl, so Prisma's "native" binary-target
# auto-detection (which runs during `yarn install`'s postinstall -> prisma generate)
# can't probe the real OpenSSL version and silently falls back to a wrong guess
# (debian-openssl-1.1.x instead of Bookworm's actual 3.0.x), which fails at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN yarn install --frozen-lockfile
RUN yarn workspace @tim/shared-types build

WORKDIR /app/apps/chat
RUN yarn build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
