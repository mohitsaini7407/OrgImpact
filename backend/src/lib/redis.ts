import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || (process.env.NODE_ENV === "production" ? "" : "redis://localhost:6379");
if (!redisUrl) throw new Error("REDIS_URL is required in production");

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (error) => {
  console.error("Redis Client Error:", error);
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  console.log("Redis connected successfully");
}