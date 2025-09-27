import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

import { registerSocketHandlers } from "./handlers";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT || process.argv[2] || 3001;

server.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
