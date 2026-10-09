import { z } from "zod";

export const createMembershipSchema = z
  .object({
    email: z.string().trim().email("Invalid email").max(320),
    organizationId: z.string().uuid("Invalid organization ID"),
  })
  .strict();
