import { prisma } from "../lib/prisma.js";

const VALID_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;

type MembershipRole = (typeof VALID_ROLES)[number];

export async function createMembership(
  userId: string,
  organizationId: string,
  role: string,
) {
  if (!VALID_ROLES.includes(role as MembershipRole)) {
    throw new Error(
      "Invalid membership role. Allowed roles: OWNER, ADMIN, MEMBER",
    );
  }

  return prisma.membership.create({
    data: {
      userId,
      organizationId,
      role,
    },
  });
}

export async function getOrganizationMembers(
  organizationId: string,
) {
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
