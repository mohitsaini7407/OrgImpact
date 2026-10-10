import { z } from "zod";

export function normalizeRelationshipTypeName(value: string) {
  return value.trim().toUpperCase();
}

const relationshipTypeNameSchema = z.string().trim()
  .min(1, "Relationship type name is required")
  .max(60, "Relationship type name must be 60 characters or fewer")
  .transform(normalizeRelationshipTypeName);

export const createRelationshipTypeSchema = z.object({
  organizationId: z.string().uuid(),
  name: relationshipTypeNameSchema,
}).strict();
