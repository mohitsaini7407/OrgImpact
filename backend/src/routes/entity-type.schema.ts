import { z } from "zod";

export const createEntityTypeSchema = z.object({
  name: z.string().trim().min(1, "Entity type name is required"),
});
