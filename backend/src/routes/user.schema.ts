import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),

  email: z
    .string()
    .trim()
    .email("Invalid email address"),
});