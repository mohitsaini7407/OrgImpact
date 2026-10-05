import { prisma } from "../lib/prisma.js";

export async function createTeamMember(
  userId: string,
  teamId: string,
  role: string,
) {
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
) {
  return prisma.teamMember.findMany({
    where: {
      teamId,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}