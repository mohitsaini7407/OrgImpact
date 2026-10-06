import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisPublisher = createClient({
  url: redisUrl,
});

export const redisSubscriber = redisPublisher.duplicate();

redisPublisher.on("error", (error) => {
  console.error("Redis Publisher Error:", error);
});

redisSubscriber.on("error", (error) => {
  console.error("Redis Subscriber Error:", error);
});

export async function connectRedisPubSub() {
  if (!redisPublisher.isOpen) {
    await redisPublisher.connect();
  }

  if (!redisSubscriber.isOpen) {
    await redisSubscriber.connect();
  }

  console.log("Redis Pub/Sub connected successfully");
}
