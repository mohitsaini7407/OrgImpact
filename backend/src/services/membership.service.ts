import { prisma } from "../lib/prisma.js";

export async function createMembership(
  userId: string,
  organizationId: string,
  role: string,
) {
  return prisma.membership.create({
    data: {
      userId,
      organizationId,
      role,
    },
  });
}

export async function getOrganizationMembers(organizationId: string) {
  return prisma.membership.findMany({
    where: {
      organizationId,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}