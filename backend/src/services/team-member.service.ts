import { prisma } from "../lib/prisma.js";

export async function createTeamMember(
  userId: string,
  teamId: string,
  role: string,
) {
  const [user, team] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
    }),
    prisma.team.findUnique({
      where: {
        id: teamId,
      },
    }),
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  if (!team) {
    throw new Error("Team not found");
  }

  const userMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: team.organizationId,
      },
    },
  });

  if (!userMembership) {
    throw new Error(
      "User must belong to the same organization as the team",
    );
  }

  return prisma.teamMember.create({
    data: {
      userId,
      teamId,
      role,
    },
  });
}

export async function getTeamMembers(
  teamId: string,
  organizationId: string,
) {
  return prisma.teamMember.findMany({
    where: {
      teamId,
      team: {
        organizationId,
      },
    },
    select: {
      id: true,
      userId: true,
      teamId: true,
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