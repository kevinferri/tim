# Agents

This file documents recurring commands, scripts, and project structure for the discord-clone-socket-server project.

## Project Overview

A Node.js TypeScript WebSocket server for a Discord-like chat application using Socket.IO, PostgreSQL (via Knex), and various event handlers for real-time communication.

## Available Scripts (from package.json)

- `yarn build`: Removes node_modules, reinstalls, compiles TypeScript to dist/, then installs production dependencies.
- `yarn start`: Runs the compiled server from dist/app.js.
- `yarn watch`: Starts nodemon in watch mode for development, loading environment from .env.local.
- `yarn test`: Placeholder script (currently errors out).

## Development Setup

1. Install dependencies: `yarn install`
2. Set up environment variables (see .env.local example if available)
3. Run in watch mode: `yarn watch`
4. For production: `yarn build && yarn start`

## Database

Uses Knex.js with PostgreSQL. Common commands (assuming knex CLI installed):

- `npx knex migrate:latest`: Run pending migrations
- `npx knex migrate:rollback`: Rollback last migration
- `npx knex seed:run`: Run seed files

## Project Structure

- `src/app.ts`: Main server entry point
- `src/event-handlers/`: Socket.IO event handlers
- `src/lib/`: Utility functions (encryption, notifications, OpenAI integration, etc.)
- `src/db/`: Database client, queries, and mutations
- `src/middleware.ts`: Socket.IO middleware

## Environment Variables

- `WS_PORT`: Port for the WebSocket server
- `FRONTEND_URL`: CORS origin for frontend
- Database connection details (likely in .env.local)

## Key Features

- Real-time messaging with send, edit, delete, and GIF shuffling
- Room and circle management
- Topic handling
- User activity tracking (typing, status, etc.)
- Notifications
- Highlights/tagging

## Socket Handler Patterns

### Authentication & Middleware

- JWT-based auth via `socket.handshake.auth.token`
- Middleware decodes token, sets `socket.data.user` with user info and initial state
- Unauthorized sockets rejected with error

### Event Registration

- Handlers registered in `registerEventHandlers()` on connection
- Each handler takes `{ socket, server }` args
- Uses `socket.on(event, async (payload) => { ... })` pattern

### Room Management

- Rooms keyed as `"roomType::id"` (e.g., `"topic::123"`)
- `joinRoom`/`leaveRoom` events with authorization via DB queries (`isUserInTopic`, `isUserInCircle`)
- `getRoomKeyOrFail()` validates socket is in room before actions
- Emits user presence changes to parent rooms (topics to circles)

### Message Handling

- Messages encrypted at rest, decrypted for emission
- Commands start with `/`, parsed via `getCommandTokens()`
- Registry maps command types (e.g., `/giphy`, `/tim`) to async execute functions
- DB mutations (`writeMessage`, `editMessage`, `deleteMessage`) followed by room emissions

### User Activity

- State tracked on `socket.data.user.state` (idle, typing, status)
- Handlers update state via `handleActiveUserStateChange()`/`handleActiveUserAttributeChange()`
- Emits activity events to topic rooms
- Notifications triggered for image expands/links via `emitNotification()`

### Data Flow

- Payload validation → Room auth check → DB operation → Room emission
- Heavy use of `server.to(roomKey).emit()` for real-time updates
- Context passed to commands (socket, server, payload) for complex logic

### Key Utilities

- `commandRegistry`: Maps slash commands to media/API fetchers (Giphy, YouTube, OpenAI)
- Encryption: `decrypt()` for message text, `encrypt()` implied for storage
- Notifications: `emitNotification()` with types (expanded image, clicked link)
