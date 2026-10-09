import { z } from "zod";

export const createDirectConversationSchema = z.object({
  userId: z.string().uuid(),
}).strict();

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1, "Message cannot be empty").max(4000, "Messages must be 4,000 characters or fewer"),
  clientMessageId: z.string().uuid(),
}).strict();
