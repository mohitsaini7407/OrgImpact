import { z } from "zod";

export const createMembershipSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
    organizationId: z.string().uuid("Invalid organization ID"),
    role: z
      .enum(["OWNER", "ADMIN", "MEMBER"])
      .default("MEMBER"),
  })
  .strict();