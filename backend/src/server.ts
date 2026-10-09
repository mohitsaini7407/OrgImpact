import "dotenv/config";
import http from "http";
import { connectRedis } from "./lib/redis.js";
import { connectRedisPubSub } from "./lib/redis-pubsub.js";
import { subscribeToChatRealtimeEvents, subscribeToRealtimeEvents } from "./lib/realtime.js";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { initializeSocket } from "./socket.js";
import { validateProductionConfig } from "./config/security.js";

const PORT = Number(process.env.PORT) || 5000;
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

async function startServer() {
  try {
    validateProductionConfig();
    
    await prisma.$connect();

    console.log("Database connected successfully");

    await connectRedis();
    
    await connectRedisPubSub();

    await subscribeToRealtimeEvents();
    await subscribeToChatRealtimeEvents();

    const httpServer = http.createServer(app);

    initializeSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`OrgImpact API running on port ${PORT}`);
      console.log(`Socket.IO running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
