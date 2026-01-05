/**
 * Отдельный Socket.IO сервер для деплоя на отдельном хостинге
 * (Railway, Render, или другой сервис с поддержкой постоянных соединений)
 * 
 * Для локальной разработки используйте server.ts
 * Для продакшена деплойте этот файл на отдельный сервис
 */

import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import socketHandler from "./src/lib/socketHandler";

const port = parseInt(process.env.PORT || "3001", 10);
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
  : ["http://localhost:3000"];

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }
  
  res.writeHead(404);
  res.end("Not Found");
});

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Импортируем обработчики socket.io
socketHandler(io);

httpServer
  .once("error", (err) => {
    console.error("Server error:", err);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`Socket.IO server running on port ${port}`);
    console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
  });

