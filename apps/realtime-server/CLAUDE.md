# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js/TypeScript Socket.IO server (`tim-chat-server`) providing real-time chat for a Discord-like app: messaging, rooms (topics/circles), presence, typing/status activity, highlights, and notifications. Data is stored in PostgreSQL via Knex; there is no ORM schema/migrations in this repo (managed elsewhere) — treat `src/db` as the only interface to the schema.

## Commands

- `yarn watch` — run the dev server with nodemon/ts-node, loading env from `.env.local` (`env $(cat .env.local) nodemon src/app.ts`).
- `yarn build` — clean install, compile TypeScript to `dist/`, then reinstall with `--production`. This is the deploy build, not a typical local dev command.
- `yarn start` — run the compiled server from `dist/app.js` (production).
- There is no test suite (`yarn test` is a placeholder that exits with an error) and no lint script configured.

## Architecture

### Entry point and connection lifecycle

`src/app.ts` creates a plain HTTP server (with a `/api/ping` health check) and attaches a Socket.IO server at path `/ws/`. `middleware.ts` runs on every connection: it verifies the JWT from `socket.handshake.auth.token`, then sets `socket.data.user` to the decoded token plus an initial activity state from `getInitialActiveUserState()` (`src/lib/user-change-handler.ts`). Unauthenticated sockets are rejected before any handler runs.

`src/event-handlers/main.ts` is the hub: it re-exports the `SocketEvent` enum from the shared `@tim/shared-types` package (`packages/shared-types/src/socket-events.ts` is the canonical source, shared with `apps/chat` — add new wire events there, not here) and defines `registerEventHandlers(server)`, which on `connection` wires up every handler module (rooms, messages, circles, topics, highlights, user-activity, socket lifecycle, plus `any.ts` for logging all in/out events). A second `socket.use` guard re-checks `socket.data.user` per-event. Every handler function takes `{ socket, server }: HandlerArgs`.

### Rooms

`src/event-handlers/rooms.ts` is central to authorization and presence. Room keys are strings of the form `"<roomType>::<id>"` (`RoomType.Topic | Circle | User`, via `toRoomKey`/`ROOM_KEY_INDICATOR`). Joining a room checks DB membership (`isUserInTopic`/`isUserInCircle` in `src/db/queries.ts`) before `socket.join`. Most other handlers call `getRoomKeyOrFail()` to verify the acting socket is already in the relevant room before doing anything — treat this as the authorization pattern to replicate for new handlers. Joining/leaving a topic room re-broadcasts the topic's active-user list up to its parent circle room (`emitUserChangeInTopic`); joining a circle room pushes the joining user the full topic/active-user map for that circle (`emitUserJoinedCircle`).

### Messages and slash commands

`src/event-handlers/messages.ts` handles send/edit/delete/shuffleGif. Message text is encrypted at rest (`src/lib/encryption.ts`: `encrypt`/`decrypt`) and decrypted only when emitted to clients. Before persisting, `send` checks if the message starts with `/`: `getCommandTokens()` (`src/lib/command-handler.ts`) splits off the command name and prompt, and `commandRegistry` maps command names (`giphy`/`giph`, `youtube`/`yt`, `tim`) to an `execute(prompt, { socket, server, payload })` that returns a `mediaUrl` string to attach to the message (Giphy/YouTube lookups in `src/lib/media-fetchers.ts`, OpenAI chat in `src/lib/open-ai.ts`). New slash commands are added by registering another entry in `commandRegistry`. The general flow for message ops is: room-membership check → DB mutation (`src/db/mutations.ts`) → emit decrypted result to the room.

### User activity and notifications

`src/event-handlers/user-activity.ts` updates `socket.data.user.state` (idle/typing/status) via `handleActiveUserStateChange()`/`handleActiveUserAttributeChange()` (`src/lib/user-change-handler.ts`) and re-emits presence to topic rooms. Image-expand and link-click activity also trigger `emitNotification()` (`src/lib/notifications.ts`).

### Data flow pattern

Handlers consistently follow: validate payload → verify room membership/authorization via a DB query → perform the DB mutation → `server.to(roomKey).emit(...)` the result to the room. Keep new handlers consistent with this shape, and register them in `main.ts`'s `registerEventHandlers`.

## Environment variables

`WS_PORT`, `FRONTEND_URL` (CORS origin), `JWT_SECRET`, `DATABASE_URL`, `DATABASE_SSL_CERT` (base64 CA cert, required only in production), `CRYPTO_ALGORITHM`/`CRYPTO_IV`/`CRYPTO_SECRET` (message encryption), `GIPHY_KEY`, `YOUTUBE_ID`/`YOUTUBE_KEY`/`YOUTUBE_SECRET`, `OPENAI_API_KEY`, `DEBUG`.
