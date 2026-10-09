import { z } from "zod";

const colorSchema = z.string().regex(
  /^#[0-9A-Fa-f]{6}$/,
  "Color must be a six-digit hex value",
);

export const createEntityTypeSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(1, "Type name is required").max(60, "Type name must be 60 characters or fewer"),
  color: colorSchema,
}).strict();

export const updateEntityTypeSchema = z.object({
  name: z.string().trim().min(1, "Type name is required").max(60, "Type name must be 60 characters or fewer").optional(),
  color: colorSchema.optional(),
}).strict().refine((data) => data.name !== undefined || data.color !== undefined, {
  message: "Provide a type name or color to update",
});
