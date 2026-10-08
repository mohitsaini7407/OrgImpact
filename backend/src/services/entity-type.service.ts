import { prisma } from "../lib/prisma.js";

export async function getEntityTypes() {
  return prisma.entityType.findMany({
    orderBy: { createdAt: "asc" },
  });
}