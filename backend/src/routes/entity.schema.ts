import { z } from "zod";

const criticalitySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const createEntitySchema = z.object({
  organizationId: z.string().uuid(),

  entityTypeId: z.string().uuid(),

  name: z
    .string()
    .trim()
    .min(2, "Entity name must contain at least 2 characters"),

  description: z
    .string()
    .trim()
    .optional(),

  criticality: criticalitySchema.default("MEDIUM"),
});

export const updateEntitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Entity name must contain at least 2 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .nullable()
    .optional(),

  criticality: criticalitySchema.optional(),
});