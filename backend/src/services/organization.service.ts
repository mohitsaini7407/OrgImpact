import { prisma } from "../lib/prisma.js";

export async function createOrganization(name: string, slug: string) {
  return prisma.organization.create({
    data: {
      name,
      slug,
    },
  });
}

export async function getOrganizations() {
  return prisma.organization.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}