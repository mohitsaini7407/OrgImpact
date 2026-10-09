import { z } from "zod";

export const createTeamMemberSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
    teamId: z.string().uuid("Invalid team ID"),
    role: z.enum(["MEMBER", "LEAD"]).default("MEMBER"),
  })
  .strict();
