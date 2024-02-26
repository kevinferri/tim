import { createServer } from "http";
import { Server } from "socket.io";
import { registerEventHandlers } from "./event-handlers/main";
import { middleware } from "./middleware";

const port = process.env.PORT;
const httpServer = createServer();

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
  console.log(`server running at http://localhost:${port}`);
});
