import { z } from "zod";

export const createTeamMemberSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
    teamId: z.string().uuid("Invalid team ID"),
    role: z
      .enum(["OWNER", "ADMIN", "MEMBER"])
      .default("MEMBER"),
  })
  .strict();