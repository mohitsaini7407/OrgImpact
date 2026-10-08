import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(320),
  organizationId: z.string().uuid(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
}).strict();

export const acceptInvitationSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  password: z.string().min(8).max(128).optional(),
}).strict();
