import { prisma } from "../lib/prisma.js";

export async function createOrganization(
  name: string,
  slug: string,
  ownerId: string,
) {
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name,
        slug,
      },
    });

    await tx.membership.create({
      data: {
        userId: ownerId,
        organizationId: organization.id,
        role: "OWNER",
      },
    });

    return organization;
  });
}

export async function getOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      memberships: {
        some: {
          userId,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
