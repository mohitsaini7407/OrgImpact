import { z } from "zod";
export const createMembershipSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
    organizationId: z.string().uuid("Invalid organization ID"),
    role: z
        .string()
        .trim()
        .min(1, "Role is required")
        .default("MEMBER"),
});
//# sourceMappingURL=membership.schema.js.map