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
    select: {
      id: true,
      userId: true,
      organizationId: true,
      role: true,
      createdAt: true,
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
    select: {
      id: true,
      userId: true,
      organizationId: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}