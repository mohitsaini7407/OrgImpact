import { z } from "zod";

const severitySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const createIncidentSchema = z
  .object({
    organizationId: z.string().uuid(),
    affectedEntityId: z.string().uuid(),
    title: z.string().trim().min(3, "Title must be at least 3 characters"),
    description: z.string().trim().optional(),
    severity: severitySchema.default("MEDIUM"),
  })
  .strict();

export const updateIncidentSchema = z
  .object({
    title: z.string().trim().min(3).optional(),
    description: z.string().trim().nullable().optional(),
    severity: severitySchema.optional(),
    status: z
      .enum(["OPEN", "INVESTIGATING", "RESOLVED"])
      .optional(),
  })
  .strict();