import { prisma } from "../lib/prisma.js";

export async function createMembership(
  email: string,
  organizationId: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { email: normalizedEmail },
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
          userId: user.id,
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
      userId: user.id,
      organizationId,
      role: "MEMBER",
    },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
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
      organization: {
        select: { createdById: true },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}
