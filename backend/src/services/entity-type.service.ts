import { prisma } from "../lib/prisma.js";

export async function createEntityType(name: string) {
  return prisma.entityType.create({
    data: { name },
  });
}

export async function getEntityTypes() {
  return prisma.entityType.findMany({
    orderBy: { createdAt: "asc" },
  });
}
