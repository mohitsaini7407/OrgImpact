import { redisPublisher, redisSubscriber } from "./redis-pubsub.js";
import { getIO } from "../socket.js";

const REALTIME_CHANNEL = "orgimpact:events";

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

        io.to(`organization:${realtimeEvent.organizationId}`).emit(
          realtimeEvent.event,
          realtimeEvent.data,
        );

        console.log(
          `Realtime event broadcast: ${realtimeEvent.event}`,
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