import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma.js";
import { publishChatRealtimeEvent } from "./lib/realtime.js";
import {
  getAuthorizedConversation,
  getMessageRecipients,
  markConversationRead,
  persistMessage,
} from "./services/chat.service.js";
import { chatMessageSchema } from "./routes/chat.schema.js";
import { getAllowedFrontendOrigins } from "./config/security.js";

let io: Server;

type SocketAck = (result: { ok: boolean; error?: string; message?: unknown }) => void;

export function initializeSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: getAllowedFrontendOrigins(),
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const secret = process.env.JWT_SECRET;
    if (typeof token !== "string" || !secret) {
      next(new Error("Authentication required"));
      return;
    }
    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      if (typeof payload === "string" || typeof payload.userId !== "string" || !payload.userId || !(await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } }))) {
        next(new Error("Authentication required"));
        return;
      }
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on("join-organization", async (organizationId: unknown, ack?: SocketAck) => {
      if (typeof organizationId !== "string") {
        ack?.({ ok: false, error: "Invalid organization" });
        return;
      }
      const membership = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
        select: { id: true },
      });
      if (!membership) {
        ack?.({ ok: false, error: "Organization not found" });
        return;
      }
      await socket.join(`organization:${organizationId}`);
      socket.emit("organization-joined", { organizationId });
      ack?.({ ok: true });
    });

    socket.on("leave-organization", async (organizationId: unknown) => {
      if (typeof organizationId === "string") await socket.leave(`organization:${organizationId}`);
    });

    socket.on("chat:join-conversation", async (conversationId: unknown, ack?: SocketAck) => {
      if (typeof conversationId !== "string" || !(await getAuthorizedConversation(conversationId, userId))) {
        ack?.({ ok: false, error: "Conversation not found" });
        return;
      }
      await socket.join(`conversation:${conversationId}`);
      ack?.({ ok: true });
    });

    socket.on("chat:leave-conversation", async (conversationId: unknown) => {
      if (typeof conversationId === "string") await socket.leave(`conversation:${conversationId}`);
    });

    let messageTimes: number[] = [];
    socket.on("chat:send-message", async (payload: unknown, ack?: SocketAck) => {
      const parsed = chatMessageSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message" });
        return;
      }
      const now = Date.now();
      messageTimes = messageTimes.filter((time) => now - time < 10_000);
      if (messageTimes.length >= 20) {
        ack?.({ ok: false, error: "You are sending messages too quickly. Try again shortly." });
        return;
      }
      if (!socket.rooms.has(`conversation:${parsed.data.conversationId}`)) {
        ack?.({ ok: false, error: "Join the conversation before sending a message" });
        return;
      }
      messageTimes.push(now);

      let persisted;
      try {
        persisted = await persistMessage({ ...parsed.data, senderId: userId });
        if (!persisted) {
          ack?.({ ok: false, error: "Conversation not found" });
          return;
        }
        ack?.({ ok: true, message: persisted.message });
      } catch (error) {
        console.error("Unable to persist chat message:", error);
        ack?.({ ok: false, error: "Message could not be saved. Please try again." });
        return;
      }

      try {
        const recipientIds = await getMessageRecipients(parsed.data.conversationId);
        await publishChatRealtimeEvent({
          event: "chat:message",
          recipientIds,
          data: { conversationId: parsed.data.conversationId, message: persisted.message },
        });
      } catch (error) {
        // Persistence already succeeded and was acknowledged. Redis failure must not
        // turn that successful send into a false failure for the sender.
        console.error("Unable to distribute persisted chat message:", error);
        try {
          const recipientIds = await getMessageRecipients(parsed.data.conversationId);
          for (const recipientId of recipientIds) {
            io.to(`user:${recipientId}`).emit("chat:message", {
              conversationId: parsed.data.conversationId,
              message: persisted.message,
            });
          }
        } catch (fallbackError) {
          console.error("Unable to deliver chat message locally:", fallbackError);
        }
      }
    });

    let typingTimes = new Map<string, number>();
    socket.on("chat:typing", async (conversationId: unknown) => {
      if (typeof conversationId !== "string" || !socket.rooms.has(`conversation:${conversationId}`)) return;
      if (!(await getAuthorizedConversation(conversationId, userId))) return;
      const now = Date.now();
      if (now - (typingTimes.get(conversationId) ?? 0) < 1500) return;
      typingTimes.set(conversationId, now);
      const recipientIds = (await getMessageRecipients(conversationId)).filter((recipientId) => recipientId !== userId);
      await publishChatRealtimeEvent({
        event: "chat:typing",
        recipientIds,
        data: { conversationId, userId, expiresIn: 2500 },
      });
    });

    socket.on("chat:mark-read", async (conversationId: unknown, ack?: SocketAck) => {
      if (typeof conversationId !== "string") {
        ack?.({ ok: false, error: "Invalid conversation" });
        return;
      }
      const read = await markConversationRead(conversationId, userId);
      if (!read) {
        ack?.({ ok: false, error: "Conversation not found" });
        return;
      }
      ack?.({ ok: true, message: read });
      const recipientIds = await getMessageRecipients(conversationId);
      await publishChatRealtimeEvent({
        event: "chat:read",
        recipientIds,
        data: { ...read, userId },
      });
    });
  });

  return io;
}

export function revokeOrganizationMembership(userId: string, organizationId: string) {
  if (!io) return;
  io.in(`user:${userId}`).socketsLeave(`organization:${organizationId}`);
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO has not been initialized");
  return io;
}
