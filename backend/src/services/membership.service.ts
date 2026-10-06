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

  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
    }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  if (!organization) {
    throw new Error("Organization not found");
  }

  const existingMembership =
    await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

  if (existingMembership) {
    throw new Error(
      "User is already a member of this organization",
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