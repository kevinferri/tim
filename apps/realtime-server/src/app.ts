import { createServer } from "http";
import { Server } from "socket.io";
import { registerEventHandlers } from "./event-handlers/main";
import { middleware } from "./middleware";
import { parse } from "url";

const port = process.env.WS_PORT;
const httpServer = createServer((req, res) => {
  // Health check TODO: log somewhere?
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
