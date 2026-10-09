import { z } from "zod";

export const createTeamSchema = z
  .object({
    organizationId: z.string().uuid(),
    name: z.string().trim().min(1, "Team name is required"),
    slug: z
      .string()
      .trim()
      .min(1, "Team slug is required")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain only lowercase letters, numbers, and hyphens",
      ),
  })
  .strict();

export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(1, "Team name is required"),
    slug: z
      .string()
      .trim()
      .min(1, "Team slug is required")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain only lowercase letters, numbers, and hyphens",
      ),
  })
  .strict();
