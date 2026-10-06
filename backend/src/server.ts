import "dotenv/config";
import http from "http";
import { connectRedis } from "./lib/redis.js";
import { connectRedisPubSub } from "./lib/redis-pubsub.js";
import { subscribeToRealtimeEvents } from "./lib/realtime.js";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { initializeSocket } from "./socket.js";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    
    await prisma.$connect();

    console.log("Database connected successfully");

    await connectRedis();
    
    await connectRedisPubSub();

    await subscribeToRealtimeEvents();

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