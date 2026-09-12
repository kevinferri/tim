// Must run before any other import: pg (via knex) serializes JS Date values
// for the wire using the process's own local timezone, not the Postgres
// session's -- on a host whose local zone isn't UTC, every "timestamp
// without time zone" column this service writes (messages.createdAt,
// topic_histories.updatedAt) ends up shifted by that offset once read back
// through apps/chat's Prisma client, which always treats those columns'
// literal digits as UTC (e.g. topics wrongly flip back to "unread" after
// being read). This only compiles first because tsconfig's CommonJS target
// makes `require` calls run in file order, unlike hoisted ESM imports.
process.env.TZ = "UTC";

import { createServer } from "http";
import { Server } from "socket.io";
import { registerEventHandlers } from "./event-handlers/main";
import { middleware } from "./middleware";
import { parse } from "url";

const port = process.env.WS_PORT;
const httpServer = createServer((req, res) => {
  if (req.method === "GET" && parse(req.url, true).pathname === "/api/ping") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "pong" }));
  }
});

const wsServer = new Server(httpServer, {
  path: "/ws/",
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

wsServer.use(middleware);
registerEventHandlers(wsServer);

httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
