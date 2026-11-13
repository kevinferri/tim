// Before any import: pg/knex write Dates in local time, which Prisma reads back as UTC.
process.env.TZ = "UTC";

import { createServer } from "http";
import { DefaultEventsMap, Server } from "socket.io";
import { registerEventHandlers } from "./event-handlers/main";
import { middleware } from "./middleware";
import { parse } from "url";
import { SocketData } from "./lib/socket";

const port = process.env.WS_PORT;
const httpServer = createServer((req, res) => {
  if (req.method === "GET" && parse(req.url, true).pathname === "/api/ping") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "pong" }));
  }
});

const wsServer = new Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>(httpServer, {
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
