import { z } from "zod";

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain only lowercase letters, numbers, and hyphens",
      ),
  })
  .strict();

export const joinOrganizationSchema = z.object({
  joinCode: z.string().trim().min(8).max(20).regex(/^[A-Za-z0-9-]+$/, "Invalid join code"),
}).strict();

export const reviewJoinRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
}).strict();
