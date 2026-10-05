import { z } from "zod";
export const createTeamMemberSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
    teamId: z.string().uuid("Invalid team ID"),
    role: z
        .string()
        .trim()
        .min(1, "Role is required")
        .default("MEMBER"),
});
//# sourceMappingURL=team-member.schema.js.map