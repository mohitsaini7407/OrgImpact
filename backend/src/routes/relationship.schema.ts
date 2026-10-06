import { z } from "zod";

export const createRelationshipSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  sourceEntityId: z.string().uuid("Invalid source entity ID"),
  targetEntityId: z.string().uuid("Invalid target entity ID"),
  relationshipType: z
    .string()
    .trim()
    .min(1, "Relationship type is required"),
});