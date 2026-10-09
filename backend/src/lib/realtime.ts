import { redisPublisher, redisSubscriber } from "./redis-pubsub.js";
import { getIO } from "../socket.js";

const REALTIME_CHANNEL = "orgimpact:events";
const CHAT_REALTIME_CHANNEL = "orgimpact:chat-events";

type RealtimeEvent = {
  event: string;
  organizationId: string;
  data: unknown;
};

export async function publishRealtimeEvent(
  event: string,
  organizationId: string,
  data: unknown,
) {
  const message: RealtimeEvent = {
    event,
    organizationId,
    data,
  };

  await redisPublisher.publish(
    REALTIME_CHANNEL,
    JSON.stringify(message),
  );
}

export async function subscribeToRealtimeEvents() {
  await redisSubscriber.subscribe(
    REALTIME_CHANNEL,
    (message) => {
      try {
        const realtimeEvent = JSON.parse(message) as RealtimeEvent;

        const io = getIO();
        if (realtimeEvent.event === "organization:membership-removed") {
          const removedUserId = (realtimeEvent.data as { userId?: unknown })?.userId;
          if (typeof removedUserId === "string") {
            io.in(`user:${removedUserId}`).socketsLeave(`organization:${realtimeEvent.organizationId}`);
          }
          return;
        }

        io.to(`organization:${realtimeEvent.organizationId}`).emit(
          realtimeEvent.event,
          realtimeEvent.data,
        );
      } catch (error) {
        console.error(
          "Failed to process realtime event:",
          error,
        );
      }
    },
  );

  console.log(
    `Subscribed to Redis channel: ${REALTIME_CHANNEL}`,
  );
}

export async function publishChatRealtimeEvent(input: {
  event: "chat:message" | "chat:typing" | "chat:read";
  recipientIds: string[];
  data: unknown;
}) {
  await redisPublisher.publish(CHAT_REALTIME_CHANNEL, JSON.stringify(input));
}

export async function subscribeToChatRealtimeEvents() {
  await redisSubscriber.subscribe(CHAT_REALTIME_CHANNEL, (message) => {
    try {
      const event = JSON.parse(message) as {
        event: "chat:message" | "chat:typing" | "chat:read";
        recipientIds: string[];
        data: unknown;
      };
      const io = getIO();
      for (const userId of event.recipientIds) {
        io.to(`user:${userId}`).emit(event.event, event.data);
      }
    } catch (error) {
      console.error("Failed to process chat realtime event:", error);
    }
  });
}
