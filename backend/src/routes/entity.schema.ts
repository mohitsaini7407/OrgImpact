import { z } from "zod";

export const createEntitySchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  entityTypeId: z.string().uuid("Invalid entity type ID"),
  name: z.string().trim().min(1, "Entity name is required"),
  description: z.string().trim().optional(),
});

export const updateEntitySchema = z.object({
  entityTypeId: z.string().uuid("Invalid entity type ID").optional(),
  name: z.string().trim().min(1, "Entity name is required").optional(),
  description: z.string().trim().nullable().optional(),
});
