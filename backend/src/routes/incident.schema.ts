import { z } from "zod";

export const createIncidentSchema = z.object({
  organizationId: z.string().uuid(),
  affectedEntityId: z.string().uuid(),
  title: z.string().trim().min(3, "Title must contain at least 3 characters"),
  description: z.string().trim().optional(),
  severity: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .default("MEDIUM"),
});

export const updateIncidentSchema = z.object({
  title: z.string().trim().min(3).optional(),
  description: z.string().trim().nullable().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED"]).optional(),
});